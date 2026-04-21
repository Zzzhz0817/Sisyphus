"""
Sisyphus – Player Progression Simulator
========================================
Simulates a player's full game progression run by run, using the exact
game formulas from config.ts / StaminaSystem / JudgmentBar / PlayerState.

Outputs a stacked bar chart:
  - X axis: run number
  - Y axis: obol earned (blue bars), with ingot markers (gold) on top
"""

import math
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np

# ============================================================
# Game constants (from config.ts)
# ============================================================

# Judgment bar
BAR_WIDTH = 300          # px
POINTER_SPEED = 200      # px/s

# Judgment zone curve
FLOOR = 10               # px
BASE_RANGE = 70          # px
BONUS_PER_STAMINA = 0.55
BASE_MAX_STAMINA = 100
MAX_RANGE = 290
EXPONENT = 2.0

# Stamina
STAMINA_MAX_BASE = 100
STAMINA_COST_BASE = 10
STAMINA_REGEN_BASE = 0

# Push
PUSH_DISTANCE_BASE = 40

# Crit
CRIT_ZONE_WIDTH = 10     # px
CRIT_MIN_SUCCESS_WIDTH = 40
CRIT_MULTIPLIER = 2.0

# Dual push
DUAL_PUSH_DISCOUNT = 0.5

# Blessing
BLESSING_CHANCE = 1 / 3

# Upgrade cost
COST_MULTIPLIER = 1.8

# ============================================================
# Mountains
# ============================================================

MOUNTAINS = [
    {
        "name": "Tartarus Hills",
        "height": 2000,
        "pushMult": 1.0,
        "summitIngot": 0,
        "checkpoints": [
            (200, 10, 0), (480, 25, 0), (880, 60, 0),
            (1400, 100, 0), (1800, 130, 0), (1990, 0, 1),
        ],
    },
    {
        "name": "Underworld Path",
        "height": 5000,
        "pushMult": 0.5,
        "summitIngot": 0,
        "checkpoints": [
            (400, 50, 0), (1000, 120, 0), (2000, 250, 0),
            (3200, 400, 0), (4500, 570, 0), (4990, 0, 3),
        ],
    },
    {
        "name": "Olympus Cliffs",
        "height": 12000,
        "pushMult": 0.175,
        "summitIngot": 0,
        "checkpoints": [
            (800, 200, 0), (2500, 600, 0), (5000, 1240, 0),
            (8000, 2000, 0), (11000, 2760, 0), (11990, 0, 3),
        ],
    },
    {
        "name": "Summit of the Gods",
        "height": 24000,
        "pushMult": 0.1,
        "summitIngot": 0,
        "checkpoints": [
            (2000, 1000, 0), (6000, 4000, 0), (12000, 12000, 0),
            (18000, 20000, 0), (23000, 30000, 0),
        ],
    },
]

# ============================================================
# Upgrades
# ============================================================

UPGRADES = {
    "pushDistance": {
        "name": "Titan's Might",
        "baseCost": 5,
        "maxLevel": 20,
        "effect": [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 4.0, 4.8, 5.7,
                   6.8, 8.0, 9.4, 11.0, 12.8, 14.9, 17.3, 20.0, 23.1, 26.7],
        "prereq": None,
    },
    "staminaMax": {
        "name": "Unyielding Will",
        "baseCost": 8,
        "maxLevel": 20,
        # After level 5: halve the inter-level diffs
        # Original: [120, 150, 165, 185, 210, 235, 265, 300, 340, 385, 435, 490, 550, 615, 685, 760, 845, 935, 1035, 1145]
        # Diffs 6+: 25,30,35,40,45,50,55,60,65,70,75,85,90,100,110 → halved: 12.5,15,17.5,20,22.5,25,27.5,30,32.5,35,37.5,42.5,45,50,55
        "effect": [120, 150, 165, 185, 210,
                   222, 237, 255, 275, 297,
                   322, 349, 379, 412, 447,
                   485, 527, 572, 622, 677],
        "prereq": None,
    },
    "staminaCostReduction": {
        "name": "Iron Grip",
        "baseCost": 20,
        "maxLevel": 10,
        "effect": [5.0, 4.7, 4.4, 4.0, 3.6, 3.2, 2.8, 2.4, 2.0, 1.6],
        "prereq": ("staminaMax", 3),
    },
    "staminaRegen": {
        "name": "Divine Breath",
        "baseCost": 15,
        "maxLevel": 10,
        # All effects halved
        # Original: [0.25, 0.35, 0.50, 0.70, 1.0, 1.4, 1.9, 2.5, 3.2, 4.0]
        "effect": [0.125, 0.175, 0.25, 0.35, 0.5, 0.7, 0.95, 1.25, 1.6, 2.0],
        "prereq": ("staminaMax", 5),
    },
}

# Artifacts (purchased in order)
ARTIFACTS = [
    {"id": "criticalHit", "cost": 1},
    {"id": "dualPush",    "cost": 1},
    {"id": "wedge",       "cost": 2},
    # {"id": "qte",         "cost": 3},  # disabled for testing
]

# ============================================================
# Player model parameter
# ============================================================

PLAYER_SIGMA = 0.075      # reaction time std dev (seconds)
PUSH_INTERVAL = 0.8       # seconds per push attempt

# ============================================================
# Helper functions
# ============================================================

def normal_cdf(x):
    """Standard normal CDF via error function."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def success_zone_width(current_stamina, max_stamina):
    """Exact game formula from StaminaSystem.ts."""
    if current_stamina <= 0:
        return 0.0
    t = current_stamina / max_stamina
    rng = min(BASE_RANGE + BONUS_PER_STAMINA * (max_stamina - BASE_MAX_STAMINA), MAX_RANGE)
    return min(BAR_WIDTH, FLOOR + rng * (t ** EXPONENT))


def success_probability(zone_width):
    """P = 2Φ(W / (2Vσ)) - 1, from the tuner model."""
    if zone_width <= 0:
        return 0.0
    arg = zone_width / (2.0 * POINTER_SPEED * PLAYER_SIGMA)
    return max(0.0, 2.0 * normal_cdf(arg) - 1.0)


def crit_probability(zone_width):
    """Probability of landing in the 10px crit zone (centered in success zone)."""
    if zone_width <= CRIT_MIN_SUCCESS_WIDTH:
        return 0.0
    # Crit zone is 10px centered within the success zone; same normal model
    arg = CRIT_ZONE_WIDTH / (2.0 * POINTER_SPEED * PLAYER_SIGMA)
    return max(0.0, 2.0 * normal_cdf(arg) - 1.0)


def upgrade_cost(upgrade_id, current_level):
    """cost = floor(baseCost × 1.8^currentLevel)"""
    cfg = UPGRADES[upgrade_id]
    return math.floor(cfg["baseCost"] * (COST_MULTIPLIER ** current_level))


def get_effective_stats(levels):
    """Derive effective stats from upgrade levels (mirrors PlayerState.ts)."""
    push_lvl = levels.get("pushDistance", 0)
    push_mult = UPGRADES["pushDistance"]["effect"][push_lvl - 1] if push_lvl > 0 else 1.0
    flat_bonus = 0
    if push_lvl == 1:
        flat_bonus = 10
    elif push_lvl == 2:
        flat_bonus = 20
    push_dist = (PUSH_DISTANCE_BASE + flat_bonus) * push_mult

    sm_lvl = levels.get("staminaMax", 0)
    stamina_max = UPGRADES["staminaMax"]["effect"][sm_lvl - 1] if sm_lvl > 0 else STAMINA_MAX_BASE

    sc_lvl = levels.get("staminaCostReduction", 0)
    stamina_cost = UPGRADES["staminaCostReduction"]["effect"][sc_lvl - 1] if sc_lvl > 0 else STAMINA_COST_BASE

    sr_lvl = levels.get("staminaRegen", 0)
    stamina_regen = UPGRADES["staminaRegen"]["effect"][sr_lvl - 1] if sr_lvl > 0 else STAMINA_REGEN_BASE

    return push_dist, stamina_max, stamina_cost, stamina_regen


# ============================================================
# Simulation
# ============================================================

def simulate_run(stats, mountain, artifacts, rng):
    """
    Simulate one climb.
    Returns (peak_height, obol_earned, ingot_earned, checkpoints_collected_indices).
    """
    push_dist_base, stamina_max, stamina_cost, stamina_regen = stats
    push_dist = push_dist_base * mountain["pushMult"]

    has_crit = "criticalHit" in artifacts
    has_dual = "dualPush" in artifacts
    has_blessing = "qte" in artifacts
    # wedge doesn't affect push count in our model (player pushes continuously)

    current_stamina = stamina_max
    height = 0.0
    obol = 0
    ingot = 0
    collected = set()

    # Cost multiplier for dual push (assume perfect alternation)
    cost_mult = DUAL_PUSH_DISCOUNT if has_dual else 1.0

    max_attempts = 5000  # safety cap
    consecutive_fails = 0
    fail_limit = 8  # if player fails this many in a row, slide kicks in

    for _ in range(max_attempts):
        W = success_zone_width(current_stamina, stamina_max)

        # Blessing: 1/3 chance auto-success
        blessed = has_blessing and rng.random() < BLESSING_CHANCE

        if blessed:
            result = "success"
            # Check crit even on blessed? No — blessing returns 'success' directly
        else:
            p_success = success_probability(W)
            roll = rng.random()
            if roll < p_success:
                # Within success zone; check crit
                if has_crit:
                    p_crit = crit_probability(W)
                    # Crit probability conditional on being in success zone
                    # p_crit is absolute; conditional = p_crit / p_success
                    if p_success > 0 and rng.random() < (p_crit / p_success):
                        result = "crit"
                    else:
                        result = "success"
                else:
                    result = "success"
            else:
                result = "fail"

        if result in ("success", "crit"):
            consecutive_fails = 0
            mult = CRIT_MULTIPLIER if result == "crit" else 1.0
            height += push_dist * mult

            # Consume stamina
            current_stamina = max(0, current_stamina - stamina_cost * cost_mult)

            # Check checkpoints
            for i, (cp_h, cp_obol, cp_ingot) in enumerate(mountain["checkpoints"]):
                if i not in collected and height >= cp_h:
                    collected.add(i)
                    obol += cp_obol
                    ingot += cp_ingot

            # Check summit
            if height >= mountain["height"]:
                break
        else:
            consecutive_fails += 1
            if consecutive_fails >= fail_limit:
                break  # slide off

        # Stamina regen between pushes
        current_stamina = min(stamina_max, current_stamina + stamina_regen * PUSH_INTERVAL)

        # If stamina is 0 and no regen, zone is 0 → guaranteed fail
        if current_stamina <= 0 and stamina_regen <= 0:
            break

    return height, obol, ingot


def prereq_met(upgrade_id, levels):
    """Check if prerequisite is met for an upgrade."""
    prereq = UPGRADES[upgrade_id]["prereq"]
    if prereq is None:
        return True
    req_id, req_lvl = prereq
    return levels.get(req_id, 0) >= req_lvl


def shop_phase(obol, ingot, levels, owned_artifacts, mountains_summited):
    """
    Buy upgrades (cheapest first) and artifacts (in order).
    Returns updated (obol, ingot, levels, owned_artifacts).
    """
    # Buy artifacts in order when affordable
    for art in ARTIFACTS:
        if art["id"] not in owned_artifacts and ingot >= art["cost"]:
            ingot -= art["cost"]
            owned_artifacts.add(art["id"])

    # Buy cheapest available upgrade, repeat until can't afford anything
    while True:
        best_id = None
        best_cost = float("inf")
        for uid, cfg in UPGRADES.items():
            lvl = levels.get(uid, 0)
            if lvl >= cfg["maxLevel"]:
                continue
            if not prereq_met(uid, levels):
                continue
            c = upgrade_cost(uid, lvl)
            if c < best_cost and obol >= c:
                best_cost = c
                best_id = uid
        if best_id is None:
            break
        obol -= best_cost
        levels[best_id] = levels.get(best_id, 0) + 1

    return obol, ingot, levels, owned_artifacts


def run_simulation(max_runs=200):
    """Full game progression simulation."""
    rng = np.random.default_rng(seed=42)

    # Player state
    obol_total = 0
    ingot_total = 0
    levels = {}
    owned_artifacts = set()
    mountains_unlocked = [True, False, False, False]
    mountains_summited = [False, False, False, False]
    current_mountain_idx = 0
    # Ingot checkpoints: track which ingot checkpoints have been permanently claimed
    claimed_ingot = {i: set() for i in range(4)}

    results = []  # list of (run_number, obol_earned, ingot_earned, mountain_name, peak_height)

    for run_num in range(1, max_runs + 1):
        mountain = MOUNTAINS[current_mountain_idx]
        stats = get_effective_stats(levels)

        peak_height, run_obol, run_ingot = simulate_run(
            stats, mountain, owned_artifacts, rng
        )

        # Ingot checkpoints are one-time only: filter out already claimed
        # Re-simulate checkpoint collection with one-time ingot logic
        actual_obol = 0
        actual_ingot = 0
        for i, (cp_h, cp_obol, cp_ingot) in enumerate(mountain["checkpoints"]):
            if peak_height >= cp_h:
                actual_obol += cp_obol
                if cp_ingot > 0 and i not in claimed_ingot[current_mountain_idx]:
                    claimed_ingot[current_mountain_idx].add(i)
                    actual_ingot += cp_ingot

        # Check summit
        summited = peak_height >= mountain["height"]
        if summited and not mountains_summited[current_mountain_idx]:
            mountains_summited[current_mountain_idx] = True
            actual_ingot += mountain["summitIngot"]
            # Unlock next mountain
            next_idx = current_mountain_idx + 1
            if next_idx < len(MOUNTAINS):
                mountains_unlocked[next_idx] = True
                current_mountain_idx = next_idx

        obol_total += actual_obol
        ingot_total += actual_ingot

        results.append({
            "run": run_num,
            "obol": actual_obol,
            "ingot": actual_ingot,
            "mountain": mountain["name"],
            "peak": peak_height,
        })

        # Shop phase
        obol_total, ingot_total, levels, owned_artifacts = shop_phase(
            obol_total, ingot_total, levels, owned_artifacts, mountains_summited
        )

        # If player summited all 4 mountains and maxed upgrades, can stop
        if all(mountains_summited):
            # Keep going a few more runs for the chart
            if run_num > 10 and all(
                levels.get(uid, 0) >= cfg["maxLevel"]
                for uid, cfg in UPGRADES.items()
            ):
                break

    return results


# ============================================================
# Plotting
# ============================================================

def plot_results(results):
    """Generate stacked bar chart."""
    runs = [r["run"] for r in results]
    obols = [r["obol"] for r in results]
    ingots = [r["ingot"] for r in results]
    mountains = [r["mountain"] for r in results]

    # Mountain colors
    mountain_colors = {
        "Tartarus Hills": "#4FC3F7",
        "Underworld Path": "#5C6BC0",
        "Olympus Cliffs": "#7E57C2",
        "Summit of the Gods": "#212121",
    }
    bar_colors = [mountain_colors.get(m, "#4FC3F7") for m in mountains]

    # Replace 0 obol with 1 for log scale
    obols_log = [max(o, 1) for o in obols]

    fig, ax = plt.subplots(figsize=(max(14, len(runs) * 0.22), 7))

    # Obol bars
    ax.bar(runs, obols_log, color=bar_colors, edgecolor="none", width=0.8, label="Obol")

    # Ingot markers: small triangles above the bar
    for r in results:
        if r["ingot"] > 0:
            y = max(r["obol"], 1)
            ax.annotate(f'+{r["ingot"]} ingot', xy=(r["run"], y),
                        xytext=(0, 8), textcoords="offset points",
                        ha="center", va="bottom", fontsize=7, fontweight="bold",
                        color="#FF8F00",
                        arrowprops=dict(arrowstyle="wedge,tail_width=0.6",
                                        fc="#FFD740", ec="none", alpha=0.9))

    # Mountain transition lines
    max_obol = max(obols) if obols else 1
    label_y = max_obol * 1.5  # above tallest bar in log scale
    prev_mountain = results[0]["mountain"]
    for r in results:
        if r["mountain"] != prev_mountain:
            ax.axvline(x=r["run"] - 0.5, color="#888", linestyle="--",
                       linewidth=0.8, alpha=0.6)
            ax.text(r["run"], label_y, r["mountain"],
                    fontsize=7, rotation=45, ha="left", va="top", color="#666")
            prev_mountain = r["mountain"]

    # First mountain label
    ax.text(1, label_y, results[0]["mountain"],
            fontsize=7, rotation=45, ha="left", va="top", color="#666")

    ax.set_xlabel("Run #", fontsize=12)
    ax.set_ylabel("Obol Earned (log scale)", fontsize=12)
    ax.set_title("Sisyphus – Simulated Player Progression",
                 fontsize=14, fontweight="bold")
    ax.set_yscale("log")
    ax.legend(loc="upper left", fontsize=9)
    ax.yaxis.set_major_formatter(ticker.FuncFormatter(lambda x, _: f"{x:,.0f}"))

    # X-axis ticks
    if len(runs) > 40:
        ax.set_xticks(range(0, len(runs) + 1, 5))
    else:
        ax.set_xticks(runs)

    plt.tight_layout()
    plt.savefig("simulation_result.png", dpi=150)
    print(f"Chart saved to simulation_result.png  ({len(results)} runs simulated)")
    plt.show()


# ============================================================
# Main
# ============================================================

if __name__ == "__main__":
    print("Running Sisyphus progression simulation...")
    results = run_simulation(max_runs=9)

    # Print summary
    print(f"\nTotal runs: {len(results)}")
    for r in results:
        ingot_str = f"  +{r['ingot']} ingot" if r["ingot"] > 0 else ""
        print(f"  Run {r['run']:3d} | {r['mountain']:20s} | "
              f"peak {r['peak']:8.0f}m | obol {r['obol']:7,d}{ingot_str}")

    plot_results(results)
