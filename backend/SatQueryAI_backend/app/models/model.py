import segmentation_models_pytorch as smp

def build_change_model(encoder_name="resnet34", encoder_weights=None):
    """Build the six-channel bitemporal change-detection model."""
    return smp.Unet(
        encoder_name=encoder_name,
        encoder_weights=encoder_weights,
        in_channels=6,
        classes=1,
        activation=None
    )
