import matplotlib.pyplot as plt
import numpy as np

# Parameters from spec
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

# Initial state: max_stamina = 100
max_stamina = 100
stamina_vals = np.linspace(0, 100, 200)
width_vals = [get_success_zone_width(s, max_stamina) for s in stamina_vals]

# Plot
plt.figure(figsize=(8, 5))
plt.plot(stamina_vals, width_vals, label='Success zone width (px)', linewidth=2)
plt.scatter([100, 90, 80, 50, 20, 10, 0], [80, 67, 55, 27, 13, 11, 0], color='red', label='Example points from spec')
plt.xlabel('Current Stamina')
plt.ylabel('Success Zone Width (px)')
plt.title('Success Zone Width vs. Stamina (Initial State: Max Stamina=100)')
plt.grid(True, linestyle='--', alpha=0.7)
plt.legend()
plt.tight_layout()

# Save figure
output_path = 'success_zone_curve.png'
plt.savefig(output_path, dpi=150)
print(f'Figure saved to {output_path}')
print('Data points:')
print('Stamina\tWidth')
for s in [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0]:
    w = get_success_zone_width(s, max_stamina)
    print(f'{s}\t{w:.1f}')