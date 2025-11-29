spare

# Bulk Upload Template for Inventory

To bulk upload items, use an Excel file (.xlsx, .xls) or CSV with the following columns (case-sensitive):

| Name | Make | Model | Specification | Row | Column | Quantity | MinimumQuantity | Category |
|------|------|-------|---------------|------|------|----------|-----------------|----------|
| Example Item | ExampleMake | X100 | 10mm, 5V | R1 | B2 | 50 | 5 | consumable |

- All columns are required for each row (except Category which defaults to 'consumable' if not provided).
- Quantity and MinimumQuantity must be non-negative numbers.
- Category must be either 'critical' or 'consumable' (case-insensitive).
- Download the example template from the Add Item page.
