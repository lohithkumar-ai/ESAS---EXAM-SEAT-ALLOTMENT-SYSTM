import pandas as pd

data = {
    'SINO': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    'CM-101': [f'26101-CM-{i:03d}' for i in range(1, 11)],
    'EC-102': [f'26101-EC-{i:03d}' for i in range(1, 11)],
    'ME-102': [f'26101-ME-{i:03d}' for i in range(1, 11)],
    'EE-103': [f'26101-EE-{i:03d}' for i in range(1, 11)]
}

df = pd.DataFrame(data)
df.to_excel('test_nr.xlsx', index=False)
