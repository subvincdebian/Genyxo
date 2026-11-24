"""Runs main.py for one sandbox job: charts are saved, tables print wide."""

import os
import runpy
import sys

os.makedirs("output", exist_ok=True)

# Set up plotting before the user's code so plt.show() saves the figure.
# (Configured eagerly: hooking the import makes Python load pyplot twice.)
import matplotlib  # noqa: E402

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

plt.rcParams.update({"figure.dpi": 110, "figure.autolayout": True})
_saved = [0]


def _save_figures(*_args, **_kwargs):
    for number in plt.get_fignums():
        figure = plt.figure(number)
        _saved[0] += 1
        figure.savefig(f"output/chart_{_saved[0]}.png", dpi=144, bbox_inches="tight")
    plt.close("all")


plt.show = _save_figures

try:
    import pandas as pd  # noqa: E402

    pd.set_option("display.width", 160)
    pd.set_option("display.max_columns", 40)
    pd.set_option("display.max_rows", 80)
except Exception:  # noqa: BLE001 - pandas is optional for a run
    pass

sys.argv = ["main.py"]
try:
    runpy.run_path("main.py", run_name="__main__")
finally:
    # Figures the code made but never showed are kept too.
    _save_figures()
