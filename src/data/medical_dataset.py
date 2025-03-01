"""
Medical image dataset with preprocessing and augmentation support.

This module handles various medical imaging formats and implements appropriate
preprocessing and augmentation techniques for medical image analysis.
"""

import os
import numpy as np
import torch
from torch.utils.data import Dataset
import pydicom
from PIL import Image
import albumentations as A
from albumentations.pytorch import ToTensorV2
import cv2
from typing import List, Tuple, Optional, Dict
import nibabel as nib

class MedicalDataset(Dataset):
    """
    Dataset class for medical images supporting multiple modalities and formats.
    
    Features:
    - DICOM, NIfTI, and standard image format support
    - Automatic preprocessing based on modality
    - Medical-specific augmentations
    - Proper normalization for each modality
    - Class balancing support
    """
    
    def __init__(
        self,
        data_dir: str,
        image_paths: List[str],
        labels: List[int],
        modality: str = 'xray',
        phase: str = 'train',
        input_size: Tuple[int, int] = (224, 224),
        class_weights: Optional[np.ndarray] = None
    ):
        """
        Initialize the dataset.
        
        Args:
            data_dir (str): Root directory containing the images
            image_paths (List[str]): List of image file paths
            labels (List[int]): List of corresponding labels
            modality (str): Imaging modality ('xray', 'mri', 'ct', 'pathology', 'dermoscopy')
            phase (str): Dataset phase ('train', 'val', 'test')
            input_size (tuple): Target image size (height, width)
            class_weights (np.ndarray, optional): Weights for class balancing
        """
        self.data_dir = data_dir
        self.image_paths = image_paths
        self.labels = labels
        self.modality = modality.lower()
        self.phase = phase
        self.input_size = input_size
        self.class_weights = class_weights
        
        # Validate modality
        supported_modalities = {'xray', 'mri', 'ct', 'pathology', 'dermoscopy'}
        if self.modality not in supported_modalities:
            raise ValueError(f"Unsupported modality. Must be one of {supported_modalities}")
        
        # Set up augmentations based on modality and phase
        self.transform = self._get_transforms()
        
        # Set up modality-specific preprocessing
        self.preprocess_fn = self._get_preprocessing_fn()
    
    def _get_transforms(self) -> A.Compose:
        """Get augmentation pipeline based on modality and phase."""
        
        # Common normalization for all modalities
        normalize = A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        
        if self.phase == 'train':
            # Training augmentations
            if self.modality in ['xray', 'ct', 'mri']:
                # Augmentations for radiological images
                return A.Compose([
                    A.RandomRotate90(p=0.5),
                    A.ShiftScaleRotate(shift_limit=0.05, scale_limit=0.05, rotate_limit=15, p=0.5),
                    A.OneOf([
                        A.GaussNoise(var_limit=(10.0, 50.0)),
                        A.GaussianBlur(blur_limit=(3, 7)),
                    ], p=0.2),
                    A.GridDistortion(p=0.2),
                    A.RandomBrightnessContrast(brightness_limit=0.1, contrast_limit=0.1, p=0.2),
                    A.Resize(*self.input_size),
                    normalize,
                    ToTensorV2(),
                ])
            elif self.modality == 'pathology':
                # Augmentations for pathology slides
                return A.Compose([
                    A.RandomRotate90(p=0.5),
                    A.Flip(p=0.5),
                    A.OneOf([
                        A.HueSaturationValue(hue_shift_limit=20, sat_shift_limit=30, val_shift_limit=20),
                        A.RandomBrightnessContrast(brightness_limit=0.2, contrast_limit=0.2),
                    ], p=0.2),
                    A.Resize(*self.input_size),
                    normalize,
                    ToTensorV2(),
                ])
            else:  # dermoscopy
                # Augmentations for dermoscopy images
                return A.Compose([
                    A.RandomRotate90(p=0.5),
                    A.Flip(p=0.5),
                    A.OneOf([
                        A.HueSaturationValue(hue_shift_limit=20, sat_shift_limit=30, val_shift_limit=20),
                        A.RandomBrightnessContrast(brightness_limit=0.2, contrast_limit=0.2),
                    ], p=0.2),
                    A.Resize(*self.input_size),
                    normalize,
                    ToTensorV2(),
                ])
        else:
            # Validation/Test transforms
            return A.Compose([
                A.Resize(*self.input_size),
                normalize,
                ToTensorV2(),
            ])
    
    def _get_preprocessing_fn(self):
        """Get modality-specific preprocessing function."""
        
        if self.modality in ['xray', 'ct']:
            return self._preprocess_radiological
        elif self.modality == 'mri':
            return self._preprocess_mri
        elif self.modality == 'pathology':
            return self._preprocess_pathology
        else:  # dermoscopy
            return self._preprocess_dermoscopy
    
    def _preprocess_radiological(self, image_path: str) -> np.ndarray:
        """Preprocess X-ray or CT images."""
        if image_path.endswith('.dcm'):
            # Read DICOM file
            dcm = pydicom.dcmread(image_path)
            image = dcm.pixel_array.astype(float)
            
            # Apply windowing if available
            if hasattr(dcm, 'WindowCenter') and hasattr(dcm, 'WindowWidth'):
                center = dcm.WindowCenter
                width = dcm.WindowWidth
                image = self._apply_windowing(image, center, width)
        else:
            # Read regular image file
            image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE).astype(float)
        
        # Normalize to [0, 1]
        image = (image - image.min()) / (image.max() - image.min())
        
        # Convert to 3 channels
        image = np.stack([image] * 3, axis=-1)
        return image
    
    def _preprocess_mri(self, image_path: str) -> np.ndarray:
        """Preprocess MRI images."""
        if image_path.endswith('.nii') or image_path.endswith('.nii.gz'):
            # Load NIfTI file
            nifti = nib.load(image_path)
            image = nifti.get_fdata()
            
            # Take middle slice for 3D volumes
            if len(image.shape) == 3:
                image = image[:, :, image.shape[2]//2]
        else:
            image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE).astype(float)
        
        # Normalize to [0, 1]
        image = (image - image.min()) / (image.max() - image.min())
        
        # Convert to 3 channels
        image = np.stack([image] * 3, axis=-1)
        return image
    
    def _preprocess_pathology(self, image_path: str) -> np.ndarray:
        """Preprocess pathology slides."""
        image = cv2.imread(image_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        return image
    
    def _preprocess_dermoscopy(self, image_path: str) -> np.ndarray:
        """Preprocess dermoscopy images."""
        image = cv2.imread(image_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        return image
    
    @staticmethod
    def _apply_windowing(image: np.ndarray, center: float, width: float) -> np.ndarray:
        """Apply windowing to radiological images."""
        min_value = center - width // 2
        max_value = center + width // 2
        image = np.clip(image, min_value, max_value)
        return image
    
    def __len__(self) -> int:
        return len(self.image_paths)
    
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Get a sample from the dataset.
        
        Returns:
            tuple: (image, label) where image is a preprocessed and augmented
                  tensor and label is the corresponding class label
        """
        image_path = os.path.join(self.data_dir, self.image_paths[idx])
        label = self.labels[idx]
        
        # Preprocess image based on modality
        image = self.preprocess_fn(image_path)
        
        # Apply augmentations
        if self.transform:
            transformed = self.transform(image=image)
            image = transformed['image']
        
        return image, torch.tensor(label, dtype=torch.long)
    
    def get_class_weights(self) -> torch.Tensor:
        """Get class weights for handling class imbalance."""
        if self.class_weights is None:
            # Calculate class weights if not provided
            unique_labels, counts = np.unique(self.labels, return_counts=True)
            weights = 1.0 / counts
            weights = weights / weights.sum()
            self.class_weights = weights
        
        return torch.tensor(self.class_weights, dtype=torch.float32) 