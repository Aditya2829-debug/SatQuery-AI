"""Prompt templates and EuroSAT descriptions used in Model 2 experiments."""

PROMPT_TEMPLATES = [
    "a satellite image of {}",
    "an aerial image of {}",
    "a remote sensing image of {}",
    "a satellite view of {}",
    "an overhead image of {}",
]

SEMANTIC_PROMPTS = {
    "annual crop land": [
        "large cultivated agricultural fields with regular geometric boundaries viewed from above",
        "farmland containing annual crops arranged in rectangular field patterns",
    ],
    "forest": [
        "dense continuous forest canopy with extensive tree coverage viewed from above",
        "a satellite image dominated by dense green woodland and trees",
    ],
    "brushland or shrubland": [
        "sparse natural vegetation consisting of shrubs bushes and low woody plants",
        "irregular scrubland with scattered bushes and exposed ground viewed from above",
    ],
    "highway or road": [
        "a long paved highway or major road visible from above",
        "linear paved roads and transportation infrastructure in a satellite image",
    ],
    "industrial buildings or commercial buildings": [
        "large industrial buildings warehouses and commercial structures viewed from above",
        "factories warehouses parking lots and large rooftops in a satellite image",
    ],
    "pasture land": [
        "open grassy pasture fields used for grazing with few buildings or crops",
        "broad grass-covered fields and grazing land viewed from above",
    ],
    "permanent crop land": [
        "agricultural land containing orchards vineyards or permanent planted crops",
        "regularly spaced rows of trees or permanent crops viewed from above",
    ],
    "residential buildings or homes or apartments": [
        "a dense residential neighborhood containing houses streets and apartment buildings",
        "many small buildings arranged along urban streets in a satellite image",
    ],
    "river": [
        "a long narrow winding river channel containing water viewed from above",
        "a flowing river forming a narrow curved water body in a satellite image",
    ],
    "lake or sea": [
        "a large continuous open body of water such as a lake or sea",
        "a satellite image dominated by a wide blue water surface",
    ],
}


def build_prompts(label: str) -> list[str]:
    """Create the generic prompt ensemble for one class label."""
    return [template.format(label) for template in PROMPT_TEMPLATES]
