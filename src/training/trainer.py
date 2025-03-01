"""
Training module for medical image analysis with specialized metrics and visualization.

This module handles model training, validation, and testing with support for:
- Medical-specific metrics (sensitivity, specificity, AUC)
- Mixed precision training
- Gradient accumulation
- Learning rate scheduling
- Model checkpointing
- Visualization of attention maps and predictions
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.cuda.amp import GradScaler, autocast
from torch.utils.data import DataLoader
from torchmetrics import AUROC, Accuracy, Precision, Recall, Specificity
import numpy as np
from tqdm import tqdm
import wandb
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, classification_report
import seaborn as sns
from typing import Dict, Optional, Tuple
import cv2

class MedicalTrainer:
    """
    Trainer class for medical image analysis models.
    
    Features:
    - Mixed precision training
    - Gradient accumulation
    - Medical-specific metrics
    - Attention map visualization
    - Uncertainty visualization
    - Model checkpointing
    """
    
    def __init__(
        self,
        model: nn.Module,
        criterion: nn.Module,
        optimizer: optim.Optimizer,
        device: torch.device,
        num_classes: int,
        scheduler: Optional[torch.optim.lr_scheduler._LRScheduler] = None,
        gradient_accumulation_steps: int = 1,
        use_amp: bool = True,
        class_names: Optional[list] = None
    ):
        """
        Initialize the trainer.
        
        Args:
            model: Neural network model
            criterion: Loss function
            optimizer: Optimization algorithm
            device: Device to run on (CPU/GPU)
            num_classes: Number of classes
            scheduler: Learning rate scheduler
            gradient_accumulation_steps: Number of steps to accumulate gradients
            use_amp: Whether to use automatic mixed precision
            class_names: List of class names for visualization
        """
        self.model = model
        self.criterion = criterion
        self.optimizer = optimizer
        self.device = device
        self.scheduler = scheduler
        self.gradient_accumulation_steps = gradient_accumulation_steps
        self.use_amp = use_amp
        self.class_names = class_names or [f"Class {i}" for i in range(num_classes)]
        
        # Initialize metrics
        self.metrics = {
            'auroc': AUROC(num_classes=num_classes, task='multiclass'),
            'accuracy': Accuracy(task='multiclass', num_classes=num_classes),
            'precision': Precision(task='multiclass', num_classes=num_classes, average='macro'),
            'recall': Recall(task='multiclass', num_classes=num_classes, average='macro'),
            'specificity': Specificity(task='multiclass', num_classes=num_classes, average='macro')
        }
        
        # Initialize AMP scaler
        self.scaler = GradScaler() if use_amp else None
        
        # Move model and metrics to device
        self.model.to(device)
        for metric in self.metrics.values():
            metric.to(device)
    
    def train_epoch(self, train_loader: DataLoader) -> Dict[str, float]:
        """Train for one epoch."""
        self.model.train()
        total_loss = 0
        all_preds = []
        all_labels = []
        
        progress_bar = tqdm(train_loader, desc='Training')
        
        for i, (images, labels) in enumerate(progress_bar):
            images = images.to(self.device)
            labels = labels.to(self.device)
            
            # Forward pass with mixed precision
            with autocast(enabled=self.use_amp):
                outputs = self.model(images)
                loss = self.criterion(outputs, labels)
                loss = loss / self.gradient_accumulation_steps
            
            # Backward pass with gradient accumulation
            if self.use_amp:
                self.scaler.scale(loss).backward()
                if (i + 1) % self.gradient_accumulation_steps == 0:
                    self.scaler.step(self.optimizer)
                    self.scaler.update()
                    self.optimizer.zero_grad()
            else:
                loss.backward()
                if (i + 1) % self.gradient_accumulation_steps == 0:
                    self.optimizer.step()
                    self.optimizer.zero_grad()
            
            # Update metrics
            total_loss += loss.item() * self.gradient_accumulation_steps
            preds = torch.argmax(outputs, dim=1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            
            # Update progress bar
            progress_bar.set_postfix({'loss': loss.item()})
        
        # Calculate epoch metrics
        metrics = self._calculate_metrics(all_preds, all_labels)
        metrics['loss'] = total_loss / len(train_loader)
        
        return metrics
    
    @torch.no_grad()
    def validate(self, val_loader: DataLoader) -> Dict[str, float]:
        """Validate the model."""
        self.model.eval()
        total_loss = 0
        all_preds = []
        all_labels = []
        uncertainties = []
        
        for images, labels in tqdm(val_loader, desc='Validation'):
            images = images.to(self.device)
            labels = labels.to(self.device)
            
            # Forward pass with uncertainty estimation
            outputs, uncertainty = self.model(images, return_uncertainty=True)
            loss = self.criterion(outputs, labels)
            
            # Update metrics
            total_loss += loss.item()
            preds = torch.argmax(outputs, dim=1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            uncertainties.extend(uncertainty.mean(dim=1).cpu().numpy())
        
        # Calculate metrics
        metrics = self._calculate_metrics(all_preds, all_labels)
        metrics['loss'] = total_loss / len(val_loader)
        metrics['uncertainty'] = np.mean(uncertainties)
        
        # Generate and log visualizations
        self._log_visualizations(all_preds, all_labels, uncertainties)
        
        return metrics
    
    def _calculate_metrics(self, preds: list, labels: list) -> Dict[str, float]:
        """Calculate medical-specific metrics."""
        preds = torch.tensor(preds, device=self.device)
        labels = torch.tensor(labels, device=self.device)
        
        return {
            name: metric(preds, labels).item()
            for name, metric in self.metrics.items()
        }
    
    def _log_visualizations(self, preds: list, labels: list, uncertainties: list):
        """Generate and log visualizations."""
        # Confusion matrix
        cm = confusion_matrix(labels, preds)
        plt.figure(figsize=(10, 8))
        sns.heatmap(
            cm,
            annot=True,
            fmt='d',
            xticklabels=self.class_names,
            yticklabels=self.class_names
        )
        plt.title('Confusion Matrix')
        if wandb.run:
            wandb.log({'confusion_matrix': wandb.Image(plt)})
        plt.close()
        
        # Classification report
        report = classification_report(
            labels,
            preds,
            target_names=self.class_names,
            output_dict=True
        )
        if wandb.run:
            wandb.log({'classification_report': report})
        
        # Uncertainty distribution
        plt.figure(figsize=(8, 6))
        sns.histplot(uncertainties, bins=50)
        plt.title('Prediction Uncertainty Distribution')
        if wandb.run:
            wandb.log({'uncertainty_dist': wandb.Image(plt)})
        plt.close()
    
    @torch.no_grad()
    def visualize_attention(self, image: torch.Tensor) -> np.ndarray:
        """
        Generate attention map visualization for a single image.
        
        Args:
            image: Input image tensor
            
        Returns:
            numpy.ndarray: Attention map overlaid on the original image
        """
        self.model.eval()
        image = image.unsqueeze(0).to(self.device)
        
        # Get attention weights
        attention_weights = self.model.get_attention_maps(image)
        attention_map = attention_weights[0].cpu().numpy()
        
        # Normalize attention map
        attention_map = (attention_map - attention_map.min()) / (attention_map.max() - attention_map.min())
        attention_map = cv2.resize(attention_map, (224, 224))
        
        # Convert to heatmap
        heatmap = cv2.applyColorMap(np.uint8(255 * attention_map), cv2.COLORMAP_JET)
        
        # Overlay on original image
        image = image[0].permute(1, 2, 0).cpu().numpy()
        image = (image - image.min()) / (image.max() - image.min())
        image = np.uint8(255 * image)
        
        overlay = cv2.addWeighted(image, 0.7, heatmap, 0.3, 0)
        return overlay
    
    def save_checkpoint(self, path: str, epoch: int, best_metric: float):
        """Save model checkpoint."""
        torch.save({
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict() if self.scheduler else None,
            'best_metric': best_metric,
        }, path)
    
    def load_checkpoint(self, path: str) -> Tuple[int, float]:
        """Load model checkpoint."""
        checkpoint = torch.load(path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        if self.scheduler and checkpoint['scheduler_state_dict']:
            self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
        return checkpoint['epoch'], checkpoint['best_metric'] 