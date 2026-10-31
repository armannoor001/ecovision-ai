# Dataset

Datasets are **not** committed. Arrange images as:

```
dataset/waste/
  cardboard/  glass/  metal/  organic/  paper/  plastic/
```

Sources:
1. **TrashNet** (Thung & Yang, Stanford) – https://github.com/garythung/trashnet – provides cardboard, glass, metal, paper, plastic (+ "trash", not used).
2. **Organic class** – TrashNet has no organic class. Use the `biological` folder of the Kaggle *Garbage Classification (12 classes)* dataset: https://www.kaggle.com/datasets/mostafaabla/garbage-classification and rename it to `organic/`.

Aim for a roughly balanced number of images per class (≈400–500 each).
