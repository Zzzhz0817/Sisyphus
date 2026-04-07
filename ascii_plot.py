import numpy as np

FLOOR = 10
BASE_RANGE = 70
BONUS_PER_STAMINA = 0.55
BASE_MAX_STAMINA = 100
MAX_RANGE = 290
EXPONENT = 2.0
BAR_WIDTH = 300

def get_success_zone_width(current_stamina, max_stamina):
    if current_stamina <= 0:
        return 0
    t = current_stamina / max_stamina
    range_val = min(BASE_RANGE + BONUS_PER_STAMINA * (max_stamina - BASE_MAX_STAMINA), MAX_RANGE)
    width = min(BAR_WIDTH, FLOOR + range_val * (t ** EXPONENT))
    return width

max_stamina = 100
width = 80  # max width at stamina=100
height = 20  # rows

# Create grid
grid = [[' ' for _ in range(width)] for _ in range(height)]

# Map stamina (0-100) to column (0-79)
# Map width (0-80) to row (19-0) (row 0 is top)
for col in range(width):
    stamina = col * 100 / (width - 1)
    w = get_success_zone_width(stamina, max_stamina)
    row = int((height - 1) * (1 - w / 80))
    if row < 0:
        row = 0
    if row >= height:
        row = height - 1
    # Draw point
    grid[row][col] = '*'
    # Fill below with '.' for visual
    for r in range(row + 1, height):
        if grid[r][col] == ' ':
            grid[r][col] = '.'

# Print grid with axes
print('Success Zone Width (px)')
print('80 |', ''.join(grid[0][:width]), '|')
for i in range(1, height - 1):
    if i % 4 == 0:
        label = f'{80 - i * 4} |'
    else:
        label = '   |'
    print(label, ''.join(grid[i][:width]), '|')
print('10 |', ''.join(grid[height-1][:width]), '|')
print('   +', '-' * width, '+')
print('    0', ' ' * (width // 2 - 3), '50', ' ' * (width // 2 - 3), '100')
print('                    Stamina')
print()
print('Data points:')
for s in [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0]:
    w = get_success_zone_width(s, max_stamina)
    print(f'  Stamina {s:3d}: Width {w:5.1f} px')