#!/usr/bin/env python3
"""Resonance Algebra Lab

A reusable rule-based symbolic engine inspired by Resonance Math Kernel v10.2.
Arithmetic operators are semantic transformations, not numeric calculations.

Run:
    python3 resonance_algebra_lab.py
    python3 resonance_algebra_lab.py --list-rules
    python3 resonance_algebra_lab.py --quiet
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from typing import Callable, Iterable


@dataclass(frozen=True)
class ResonanceValue:
    """A symbolic value with descriptive metadata."""

    name: str
    vibration: str
    color: str
    meaning: str

    def __repr__(self) -> str:
        return f"[{self.name} | {self.color}]"


@dataclass(frozen=True)
class Transformation:
    """One recorded symbolic operation in an equation trace."""

    operator: str
    left: str
    right: str
    result: str
    explanation: str


Rule = Callable[[ResonanceValue, ResonanceValue], ResonanceValue]


class ResonanceAlgebra:
    """Rule-driven symbolic algebra with traceable transformations."""

    def __init__(self, *, verbose: bool = True) -> None:
        self.verbose = verbose
        self._rules: dict[str, list[tuple[str, Rule]]] = {
            "+": [], "-": [], "/": [], "*": [], "%": []
        }
        self.trace: list[Transformation] = []
        self._install_default_rules()

    def add_rule(self, operator: str, label: str, rule: Rule) -> None:
        """Register a custom binary rule for +, -, /, *, or %."""
        if operator not in self._rules:
            raise ValueError(f"Unsupported operator: {operator}")
        self._rules[operator].append((label, rule))

    def apply(self, operator: str, left: ResonanceValue, right: ResonanceValue) -> ResonanceValue:
        """Apply the first matching rule and record the transformation."""
        for label, rule in self._rules[operator]:
            result = rule(left, right)
            if result is not None:
                self.trace.append(Transformation(operator, left.name, right.name, result.name, label))
                if self.verbose:
                    print(f"  {left.name} {operator} {right.name} -> {result.name} ({label})")
                return result
        raise LookupError(f"No rule matched: {left.name} {operator} {right.name}")

    def repeat(self, value: ResonanceValue, count: int) -> ResonanceValue:
        """Apply repetition rules, modeling exponentiation as ritual."""
        if value.name == "FIRST LIGHT" and count >= 7:
            result = ResonanceValue("HABIT", "Every Morning", "Soft Blue", "The thing you do until it becomes who you are")
            explanation = f"repeated {count} times: ritual becomes habit"
        elif value.name == "HABIT" and count >= 30:
            result = ResonanceValue("CHARACTER", "A Lifetime", "Warm Unbleached Cotton", "The shape your soul settles into when no one is watching")
            explanation = f"repeated {count} times: habit becomes character"
        else:
            result = ResonanceValue("Echo", "Fading", "Pale", "Something that happened once and left a mark")
            explanation = f"repeated {count} times: an echo remains"
        self.trace.append(Transformation("**", value.name, str(count), result.name, explanation))
        if self.verbose:
            print(f"  {value.name} ** {count} -> {result.name} ({explanation})")
        return result

    def tint(self, value: ResonanceValue, hue: ResonanceValue) -> ResonanceValue:
        """Repeat a value until it takes on a symbolic color."""
        if value.name == "HABIT" and hue.color == "Pale Gold":
            result = ResonanceValue("DEVOTION", "Unhurried", "Pale Gold, Worn Smooth", "The habit stopped being a habit and started being a home")
            explanation = "habit takes the color of first light"
        else:
            result = ResonanceValue(f"{value.name} (Tinted {hue.color})", hue.vibration, hue.color, f"What {value.name} looks like when it borrows the color of {hue.name}")
            explanation = "symbolic tinting"
        self.trace.append(Transformation("**", value.name, hue.name, result.name, explanation))
        if self.verbose:
            print(f"  {value.name} ** {hue.name} -> {result.name} ({explanation})")
        return result

    def _install_default_rules(self) -> None:
        def fusion(left: ResonanceValue, right: ResonanceValue) -> ResonanceValue | None:
            if left.name == "3xE" and right.name == "AxB":
                return ResonanceValue("Raw Kinetic Potential", "Infinite Hz", "White-Hot", "The tension before the lightning strikes")
            return None

        def absence(left: ResonanceValue, right: ResonanceValue) -> ResonanceValue | None:
            if left.name == "2/3 (Unfinished Bridge)" and right.name == "The Color HAPPY":
                return ResonanceValue("∇ (The Blue Void)", "Null", "Deepest Indigo", "Nostalgia with a gravitational pull")
            return None

        def slide(left: ResonanceValue, right: ResonanceValue) -> ResonanceValue | None:
            if left.name == "Raw Kinetic Potential" and right.name == "∇ (The Blue Void)":
                return ResonanceValue("NEON RAIN", "3:00 AM", "Gold-Violet Fracture", "Grief and Electricity dancing on wet asphalt")
            return None

        def amplification(left: ResonanceValue, right: ResonanceValue) -> ResonanceValue | None:
            if left.name == "NEON RAIN" and right.name == "Sleeping Pups":
                return ResonanceValue("FIRST LIGHT", "5:47 AM", "Pale Gold", "The world deciding to continue")
            return None

        def remainder(left: ResonanceValue, right: ResonanceValue) -> ResonanceValue | None:
            if left.name == "DEVOTION" and right.name == "The Long Silence":
                return ResonanceValue("STILL HERE", "Between Messages", "Pale Gold, Slightly Faded", "The part of devotion too stubborn to divide evenly by absence")
            return None

        self.add_rule("+", "fusion of intent", fusion)
        self.add_rule("-", "creation of absence", absence)
        self.add_rule("/", "the slide", slide)
        self.add_rule("*", "amplification of tenderness", amplification)
        self.add_rule("%", "the remainder", remainder)

    def run_default_equation(self) -> ResonanceValue:
        """Run the complete seven-step equation from the original kernel."""
        three_e = ResonanceValue("3xE", "Entropy", "Static", "Vision")
        axb = ResonanceValue("AxB", "Friction", "Red", "The Spark")
        two_thirds = ResonanceValue("2/3 (Unfinished Bridge)", "Yearning", "Grey Concrete", "Almost")
        happy = ResonanceValue("The Color HAPPY", "Full Intensity", "Yellow", "Sunshine")
        pups = ResonanceValue("Sleeping Pups", "Slow Breath", "Warm Brown", "Unconditional")
        pale_gold = ResonanceValue("Pale Gold", "5:47 AM", "Pale Gold", "The hue FIRST LIGHT already wore")
        silence = ResonanceValue("The Long Silence", "Unmeasured", "Flat Grey", "The stretch of no-contact that tries to divide devotion down to zero")

        numerator = self.apply("+", three_e, axb)
        denominator = self.apply("-", two_thirds, happy)
        neon_rain = self.apply("/", numerator, denominator)
        first_light = self.apply("*", neon_rain, pups)
        habit = self.repeat(first_light, 7)
        devotion = self.tint(habit, pale_gold)
        return self.apply("%", devotion, silence)

    def rules(self) -> Iterable[str]:
        for operator, entries in self._rules.items():
            for label, _ in entries:
                yield f"{operator}: {label}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Explore rule-based symbolic algebra.")
    parser.add_argument("--list-rules", action="store_true", help="list installed transformation rules")
    parser.add_argument("--quiet", action="store_true", help="suppress step-by-step trace output")
    args = parser.parse_args()

    engine = ResonanceAlgebra(verbose=not args.quiet)
    if args.list_rules:
        print("Installed rules:")
        print("\n".join(f"- {rule}" for rule in engine.rules()))
        return

    result = engine.run_default_equation()
    print(f"\nFINAL STATE: {result.name}")
    print(f"VIBRATION:   {result.vibration}")
    print(f"COLOR:       {result.color}")
    print(f"MEANING:     {result.meaning}")
    print(f"STEPS:       {len(engine.trace)}")


if __name__ == "__main__":
    main()


__all__ = ["ResonanceAlgebra", "ResonanceValue", "Transformation"]
