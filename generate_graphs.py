#!/usr/bin/env python3
"""
Oracle Failure Research Graph Generator
Generates matplotlib graphs from experiment results
"""

import json
import matplotlib.pyplot as plt
import numpy as np
import os

def load_graph_data(filepath):
    """Load graph data from JSON file"""
    with open(filepath, 'r') as f:
        return json.load(f)

def create_error_rate_plot(data, error_type, title, ylabel, filename):
    """Create a plot for error rates vs failure probability"""

    plt.figure(figsize=(10, 6))

    strategies = ['single', 'mean', 'median']
    colors = ['blue', 'red', 'green']
    markers = ['o-', 's-', '^-']

    for strategy, color, marker in zip(strategies, colors, markers):
        if strategy in data:
            points = data[strategy]
            probabilities = [point['probability'] for point in points]
            rates = [point['rate'] for point in points]

            plt.plot(probabilities, rates, marker, color=color,
                    label=strategy.capitalize(), linewidth=2, markersize=8)

    plt.xlabel('Failure Probability', fontsize=12)
    plt.ylabel(ylabel, fontsize=12)
    plt.title(title, fontsize=14, fontweight='bold')
    plt.legend(fontsize=10)
    plt.grid(True, alpha=0.3)

    # Set x-axis ticks
    plt.xticks([0, 0.1, 0.2, 0.3, 0.4, 0.5])

    # Format y-axis as percentage
    plt.gca().yaxis.set_major_formatter(plt.FuncFormatter(lambda y, _: '{:.0%}'.format(y)))

    plt.tight_layout()
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Generated: {filename}")

def create_comparison_plot(data, filename):
    """Create a comparison plot showing both error types"""

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

    strategies = ['single', 'mean', 'median']
    colors = ['blue', 'red', 'green']
    markers = ['o-', 's-', '^-']

    # False Positive subplot
    ax1.set_title('False Positive Rate\n(Incorrectly Paid Insurance)', fontsize=12, fontweight='bold')
    for strategy, color, marker in zip(strategies, colors, markers):
        if strategy in data['falsePositive']:
            points = data['falsePositive'][strategy]
            probabilities = [point['probability'] for point in points]
            rates = [point['rate'] for point in points]
            ax1.plot(probabilities, rates, marker, color=color,
                    label=strategy.capitalize(), linewidth=2, markersize=6)

    ax1.set_xlabel('Failure Probability')
    ax1.set_ylabel('False Positive Rate')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda y, _: '{:.0%}'.format(y)))

    # False Negative subplot
    ax2.set_title('False Negative Rate\n(Failed to Pay When Should)', fontsize=12, fontweight='bold')
    for strategy, color, marker in zip(strategies, colors, markers):
        if strategy in data['falseNegative']:
            points = data['falseNegative'][strategy]
            probabilities = [point['probability'] for point in points]
            rates = [point['rate'] for point in points]
            ax2.plot(probabilities, rates, marker, color=color,
                    label=strategy.capitalize(), linewidth=2, markersize=6)

    ax2.set_xlabel('Failure Probability')
    ax2.set_ylabel('False Negative Rate')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    ax2.yaxis.set_major_formatter(plt.FuncFormatter(lambda y, _: '{:.0%}'.format(y)))

    # Set common x-axis ticks
    for ax in [ax1, ax2]:
        ax.set_xticks([0, 0.1, 0.2, 0.3, 0.4, 0.5])

    plt.suptitle('Oracle Failure Impact on Parametric Insurance\nF1 Mode (Data Unavailability)', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Generated: {filename}")

def main():
    """Main function to generate all graphs"""

    # File paths
    data_file = 'results/graphs/graph-data.json'
    output_dir = 'results/graphs/'

    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # Load data
    print("Loading graph data...")
    data = load_graph_data(data_file)

    # Generate individual plots
    print("Generating individual plots...")

    create_error_rate_plot(
        data['falsePositive'],
        'falsePositive',
        'False Positive Rate vs Failure Probability\nF1 Mode (Data Unavailability)',
        'False Positive Rate',
        os.path.join(output_dir, 'false_positive_rates.png')
    )

    create_error_rate_plot(
        data['falseNegative'],
        'falseNegative',
        'False Negative Rate vs Failure Probability\nF1 Mode (Data Unavailability)',
        'False Negative Rate',
        os.path.join(output_dir, 'false_negative_rates.png')
    )

    # Generate comparison plot
    print("Generating comparison plot...")
    create_comparison_plot(
        data,
        os.path.join(output_dir, 'error_rates_comparison.png')
    )

    print("\nGraph generation completed!")
    print("Generated files:")
    print("- false_positive_rates.png")
    print("- false_negative_rates.png")
    print("- error_rates_comparison.png")

if __name__ == '__main__':
    main()