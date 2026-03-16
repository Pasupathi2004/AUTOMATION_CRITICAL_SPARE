spare

# Bulk Upload Template for Inventory

To bulk upload items, use an Excel file (.xlsx, .xls) or CSV with the following columns (case-sensitive and in this exact order):

| Name | Make | Model | Specification | Row | Column | Quantity | MinimumQuantity | MaximumQuantity | Category | Cost |
|------|------|-------|---------------|-----|--------|----------|-----------------|----------------|----------|------|
| Example Item | ExampleMake | X100 | 10mm, 5V | R1 | B2 | 50 | 5 | 100 | consumable | 25.5 |

- All columns are required for each row (except MaximumQuantity, Category and Cost which are optional; Category defaults to 'consumable' if not provided).
- Quantity, MinimumQuantity, MaximumQuantity and Cost must be non-negative numbers when provided.
- Category must be either 'critical' or 'consumable' (case-insensitive) when provided.
- Download the example template from the Add Item page.
