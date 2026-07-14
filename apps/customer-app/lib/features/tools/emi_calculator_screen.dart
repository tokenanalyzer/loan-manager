import 'package:flutter/material.dart';
import 'package:shared_flutter/shared_flutter.dart';

import '../../core/widgets/loan_cost_breakdown_card.dart';

/// A standalone "what would this cost?" tool — not tied to any
/// application. Lets a customer explore amount/tenure/category before
/// committing to a category and starting the real application flow
/// (`/loans/categories`).
class EmiCalculatorScreen extends StatefulWidget {
  const EmiCalculatorScreen({super.key});

  @override
  State<EmiCalculatorScreen> createState() => _EmiCalculatorScreenState();
}

class _EmiCalculatorScreenState extends State<EmiCalculatorScreen> {
  late LoanCategory _category = kLoanCategories.first;
  late double _amount =
      (_category.minAmount + _category.maxAmount) / 2;
  late double _tenureMonths =
      ((_category.minTermMonths + _category.maxTermMonths) / 2).roundToDouble();
  late double _rate = _category.indicativeRateMidpoint;

  void _onCategoryChanged(LoanCategory category) {
    setState(() {
      _category = category;
      _amount = _amount.clamp(category.minAmount, category.maxAmount).toDouble();
      _tenureMonths = _tenureMonths
          .clamp(category.minTermMonths.toDouble(), category.maxTermMonths.toDouble());
      _rate = category.indicativeRateMidpoint;
    });
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final breakdown = computeLoanCostBreakdown(
      principal: _amount,
      annualRatePercent: _rate,
      tenureMonths: _tenureMonths.round(),
      processingFeePercent: _category.processingFeePercent,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('EMI Calculator')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Loan type', style: textTheme.labelMedium),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final category in kLoanCategories)
                ChoiceChip(
                  label: Text(category.title),
                  selected: category.id == _category.id,
                  onSelected: (_) => _onCategoryChanged(category),
                ),
            ],
          ),
          const SizedBox(height: 24),
          _SliderField(
            label: 'Loan amount',
            valueLabel: Formatters.currency(_amount.toStringAsFixed(0)),
            value: _amount,
            min: _category.minAmount,
            max: _category.maxAmount,
            onChanged: (value) => setState(() => _amount = value),
          ),
          const SizedBox(height: 20),
          _SliderField(
            label: 'Tenure',
            valueLabel: '${_tenureMonths.round()} months',
            value: _tenureMonths,
            min: _category.minTermMonths.toDouble(),
            max: _category.maxTermMonths.toDouble(),
            onChanged: (value) => setState(() => _tenureMonths = value),
          ),
          const SizedBox(height: 20),
          _SliderField(
            label: 'Interest rate (indicative)',
            valueLabel: '${_rate.toStringAsFixed(1)}% p.a.',
            value: _rate,
            min: _category.indicativeRateMin,
            max: _category.indicativeRateMax,
            onChanged: (value) => setState(() => _rate = value),
          ),
          const SizedBox(height: 24),
          LoanCostBreakdownCard(
            title: 'Estimated EMI',
            breakdown: breakdown,
            tenureMonths: _tenureMonths.round(),
            rateLabel: '${_rate.toStringAsFixed(1)}% p.a.',
            footnote:
                'This is a calculator only — it does not start or affect any loan application.',
          ),
        ],
      ),
    );
  }
}

class _SliderField extends StatelessWidget {
  const _SliderField({
    required this.label,
    required this.valueLabel,
    required this.value,
    required this.min,
    required this.max,
    required this.onChanged,
  });

  final String label;
  final String valueLabel;
  final double value;
  final double min;
  final double max;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    // min == max would make the Slider assert; collapse to a
    // disabled-looking single-value slider instead of crashing.
    final isDegenerate = min >= max;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: textTheme.labelMedium),
            Text(valueLabel, style: textTheme.titleSmall),
          ],
        ),
        Slider(
          value: value.clamp(min, isDegenerate ? min + 1 : max),
          min: min,
          max: isDegenerate ? min + 1 : max,
          onChanged: isDegenerate ? null : onChanged,
        ),
      ],
    );
  }
}
