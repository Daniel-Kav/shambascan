"""
Medical Image Analysis CNN with attention mechanisms and uncertainty quantification.

This module implements a state-of-the-art CNN architecture for medical image analysis,
supporting multiple imaging modalities and disease detection scenarios.

Key features:
- Multi-head attention mechanisms
- Uncertainty quantification through MC Dropout
- Transfer learning from medical imaging models
- Gradient checkpointing for memory efficiency
- Mixed precision training support
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.cuda.amp import autocast
from torchvision.models import resnet50, ResNet50_Weights
import math

class AttentionBlock(nn.Module):
    """Multi-head self-attention block for focusing on relevant image regions."""
    
    def __init__(self, in_channels, num_heads=8, dropout=0.1):
        super().__init__()
        self.num_heads = num_heads
        self.norm = nn.LayerNorm(in_channels)
        self.qkv = nn.Linear(in_channels, in_channels * 3)
        self.attn_drop = nn.Dropout(dropout)
        self.proj = nn.Linear(in_channels, in_channels)
        self.proj_drop = nn.Dropout(dropout)

    def forward(self, x):
        B, C, H, W = x.shape
        x = x.flatten(2).transpose(1, 2)  # B, HW, C
        x = self.norm(x)
        
        qkv = self.qkv(x).reshape(B, -1, 3, self.num_heads, C // self.num_heads).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]

        attn = (q @ k.transpose(-2, -1)) * math.sqrt(1.0 / (C // self.num_heads))
        attn = attn.softmax(dim=-1)
        attn = self.attn_drop(attn)

        x = (attn @ v).transpose(1, 2).reshape(B, H * W, C)
        x = self.proj(x)
        x = self.proj_drop(x)
        
        return x.transpose(1, 2).reshape(B, C, H, W)

class UncertaintyHead(nn.Module):
    """Uncertainty prediction head using Monte Carlo Dropout."""
    
    def __init__(self, in_features, num_classes):
        super().__init__()
        self.dropout = nn.Dropout(p=0.5)
        self.fc = nn.Linear(in_features, num_classes)
    
    def forward(self, x, num_samples=10):
        if self.training:
            return self.fc(self.dropout(x))
        
        samples = torch.stack([self.fc(self.dropout(x)) for _ in range(num_samples)])
        mean = samples.mean(dim=0)
        variance = samples.var(dim=0)
        return mean, variance

class MedicalCNN(nn.Module):
    """
    Advanced CNN for medical image analysis with attention mechanisms,
    uncertainty quantification, and support for multiple imaging modalities.
    """
    
    def __init__(
        self,
        num_classes,
        input_channels=3,
        pretrained=True,
        dropout_rate=0.2,
        use_attention=True
    ):
        super().__init__()
        
        # Load pretrained backbone with gradient checkpointing
        self.backbone = resnet50(weights=ResNet50_Weights.IMAGENET1K_V2 if pretrained else None)
        self.backbone.train()
        for module in self.backbone.modules():
            if isinstance(module, nn.Module):
                module.gradient_checkpointing_enable()
        
        # Modify input layer for different channel counts
        if input_channels != 3:
            self.backbone.conv1 = nn.Conv2d(
                input_channels, 64, kernel_size=7, stride=2, padding=3, bias=False
            )
        
        # Remove original classification head
        backbone_out_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()
        
        # Add attention mechanism
        self.use_attention = use_attention
        if use_attention:
            self.attention = AttentionBlock(backbone_out_features)
        
        # Global pooling and dropout
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.dropout = nn.Dropout(dropout_rate)
        
        # Classification head with uncertainty estimation
        self.uncertainty_head = UncertaintyHead(backbone_out_features, num_classes)
        
    @autocast()
    def forward(self, x, return_uncertainty=False):
        """
        Forward pass with optional uncertainty estimation.
        
        Args:
            x (torch.Tensor): Input tensor of shape (batch_size, channels, height, width)
            return_uncertainty (bool): Whether to return prediction uncertainty
            
        Returns:
            tuple: (predictions, uncertainty) if return_uncertainty=True
                  predictions otherwise
        """
        # Extract features with gradient checkpointing
        features = self.backbone(x)
        
        # Apply attention if enabled
        if self.use_attention:
            features = self.attention(features)
        
        # Global pooling and dropout
        features = self.pool(features).flatten(1)
        features = self.dropout(features)
        
        # Get predictions and uncertainty if requested
        if return_uncertainty and not self.training:
            predictions, uncertainty = self.uncertainty_head(features)
            return predictions, uncertainty
        
        return self.uncertainty_head(features)
    
    def get_attention_maps(self, x):
        """
        Generate attention maps for visualization.
        
        Args:
            x (torch.Tensor): Input tensor
            
        Returns:
            torch.Tensor: Attention weights for visualization
        """
        if not self.use_attention:
            raise ValueError("Attention mechanism is disabled")
        
        features = self.backbone(x)
        B, C, H, W = features.shape
        
        # Get attention weights
        features_flat = features.flatten(2).transpose(1, 2)
        features_flat = self.attention.norm(features_flat)
        qkv = self.attention.qkv(features_flat)
        qkv = qkv.reshape(B, -1, 3, self.attention.num_heads, C // self.attention.num_heads)
        qkv = qkv.permute(2, 0, 3, 1, 4)
        q, k, _ = qkv[0], qkv[1], qkv[2]
        
        attn = (q @ k.transpose(-2, -1)) * math.sqrt(1.0 / (C // self.attention.num_heads))
        attn = attn.mean(dim=1)  # Average over heads
        
        return attn.reshape(B, H, W) 