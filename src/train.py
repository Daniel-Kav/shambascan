"""
Main training script for medical image analysis model.

This script demonstrates how to:
1. Set up the model and training components
2. Load and preprocess medical image data
3. Train the model with proper metrics and visualization
4. Save and evaluate the model
"""

import os
import argparse
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from torch.optim.lr_scheduler import CosineAnnealingLR
import wandb
from sklearn.model_selection import train_test_split
import numpy as np

from models.medical_cnn import MedicalCNN
from data.medical_dataset import MedicalDataset
from training.trainer import MedicalTrainer

def parse_args():
    parser = argparse.ArgumentParser(description='Train medical image analysis model')
    parser.add_argument('--data_dir', type=str, required=True, help='Path to data directory')
    parser.add_argument('--modality', type=str, default='xray', 
                      choices=['xray', 'mri', 'ct', 'pathology', 'dermoscopy'],
                      help='Medical imaging modality')
    parser.add_argument('--num_classes', type=int, required=True, help='Number of classes')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch size')
    parser.add_argument('--epochs', type=int, default=100, help='Number of epochs')
    parser.add_argument('--lr', type=float, default=1e-4, help='Learning rate')
    parser.add_argument('--weight_decay', type=float, default=1e-4, help='Weight decay')
    parser.add_argument('--input_size', type=int, default=224, help='Input image size')
    parser.add_argument('--device', type=str, default='cuda' if torch.cuda.is_available() else 'cpu',
                      help='Device to use (cuda/cpu)')
    parser.add_argument('--num_workers', type=int, default=4, help='Number of data loading workers')
    parser.add_argument('--checkpoint_dir', type=str, default='checkpoints',
                      help='Directory to save checkpoints')
    parser.add_argument('--log_interval', type=int, default=10, help='Logging interval')
    parser.add_argument('--seed', type=int, default=42, help='Random seed')
    return parser.parse_args()

def setup_wandb(args):
    """Initialize Weights & Biases logging."""
    wandb.init(
        project='medical-image-analysis',
        config={
            'modality': args.modality,
            'num_classes': args.num_classes,
            'batch_size': args.batch_size,
            'epochs': args.epochs,
            'lr': args.lr,
            'weight_decay': args.weight_decay,
            'input_size': args.input_size,
            'architecture': 'MedicalCNN'
        }
    )

def prepare_data(args):
    """Prepare datasets and dataloaders."""
    # Get all image files and labels
    # This is a placeholder - modify according to your data structure
    image_paths = []
    labels = []
    for class_idx, class_name in enumerate(os.listdir(args.data_dir)):
        class_dir = os.path.join(args.data_dir, class_name)
        if not os.path.isdir(class_dir):
            continue
        
        for image_name in os.listdir(class_dir):
            if image_name.endswith(('.jpg', '.png', '.dcm', '.nii', '.nii.gz')):
                image_paths.append(os.path.join(class_name, image_name))
                labels.append(class_idx)
    
    # Split data into train/val/test
    train_paths, test_paths, train_labels, test_labels = train_test_split(
        image_paths, labels, test_size=0.2, stratify=labels, random_state=args.seed
    )
    
    train_paths, val_paths, train_labels, val_labels = train_test_split(
        train_paths, train_labels, test_size=0.2, stratify=train_labels, random_state=args.seed
    )
    
    # Calculate class weights for handling imbalance
    unique_labels, counts = np.unique(train_labels, return_counts=True)
    class_weights = 1.0 / counts
    class_weights = class_weights / class_weights.sum()
    
    # Create datasets
    train_dataset = MedicalDataset(
        args.data_dir,
        train_paths,
        train_labels,
        modality=args.modality,
        phase='train',
        input_size=(args.input_size, args.input_size),
        class_weights=class_weights
    )
    
    val_dataset = MedicalDataset(
        args.data_dir,
        val_paths,
        val_labels,
        modality=args.modality,
        phase='val',
        input_size=(args.input_size, args.input_size)
    )
    
    test_dataset = MedicalDataset(
        args.data_dir,
        test_paths,
        test_labels,
        modality=args.modality,
        phase='test',
        input_size=(args.input_size, args.input_size)
    )
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=True
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=True
    )
    
    test_loader = DataLoader(
        test_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=True
    )
    
    return train_loader, val_loader, test_loader, class_weights

def main():
    args = parse_args()
    
    # Set random seed
    torch.manual_seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(args.seed)
    
    # Initialize wandb
    setup_wandb(args)
    
    # Prepare data
    train_loader, val_loader, test_loader, class_weights = prepare_data(args)
    
    # Initialize model
    model = MedicalCNN(
        num_classes=args.num_classes,
        input_channels=1 if args.modality in ['xray', 'ct', 'mri'] else 3,
        pretrained=True,
        dropout_rate=0.2,
        use_attention=True
    )
    
    # Initialize loss function with class weights
    criterion = nn.CrossEntropyLoss(
        weight=torch.tensor(class_weights, device=args.device)
    )
    
    # Initialize optimizer and scheduler
    optimizer = optim.AdamW(
        model.parameters(),
        lr=args.lr,
        weight_decay=args.weight_decay
    )
    
    scheduler = CosineAnnealingLR(
        optimizer,
        T_max=args.epochs,
        eta_min=args.lr * 0.01
    )
    
    # Initialize trainer
    trainer = MedicalTrainer(
        model=model,
        criterion=criterion,
        optimizer=optimizer,
        device=torch.device(args.device),
        num_classes=args.num_classes,
        scheduler=scheduler,
        gradient_accumulation_steps=2,
        use_amp=True
    )
    
    # Training loop
    best_metric = 0.0
    for epoch in range(args.epochs):
        print(f"\nEpoch {epoch+1}/{args.epochs}")
        
        # Train
        train_metrics = trainer.train_epoch(train_loader)
        print("\nTraining metrics:")
        for metric_name, value in train_metrics.items():
            print(f"{metric_name}: {value:.4f}")
        
        # Validate
        val_metrics = trainer.validate(val_loader)
        print("\nValidation metrics:")
        for metric_name, value in val_metrics.items():
            print(f"{metric_name}: {value:.4f}")
        
        # Log metrics
        wandb.log({
            'train': train_metrics,
            'val': val_metrics,
            'lr': scheduler.get_last_lr()[0]
        })
        
        # Save checkpoint if improved
        if val_metrics['auroc'] > best_metric:
            best_metric = val_metrics['auroc']
            trainer.save_checkpoint(
                os.path.join(args.checkpoint_dir, 'best_model.pth'),
                epoch,
                best_metric
            )
        
        # Update learning rate
        scheduler.step()
    
    # Final evaluation on test set
    print("\nEvaluating on test set...")
    test_metrics = trainer.validate(test_loader)
    print("\nTest metrics:")
    for metric_name, value in test_metrics.items():
        print(f"{metric_name}: {value:.4f}")
    
    wandb.log({'test': test_metrics})
    wandb.finish()

if __name__ == '__main__':
    main() 