import 'package:flutter/material.dart';

import '../../core/di/injection.dart';
import '../../core/models/customer_profile.dart';
import '../../core/models/customer_summary.dart';
import '../../core/network/customer_repository.dart';

/// CRM: a single customer's identity + profile (read-only).
class CustomerDetailScreen extends StatefulWidget {
  const CustomerDetailScreen({required this.customerId, super.key});

  final String customerId;

  @override
  State<CustomerDetailScreen> createState() => _CustomerDetailScreenState();
}

class _CustomerDetailScreenState extends State<CustomerDetailScreen> {
  late Future<(CustomerSummary, CustomerProfile?)> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<(CustomerSummary, CustomerProfile?)> _load() async {
    final repository = getIt<CustomerRepository>();

    final summaryResult = await repository.getCustomer(widget.customerId);
    final summary = summaryResult.when(success: (data) => data, failure: (error) => throw error);

    final profileResult = await repository.getCustomerProfile(widget.customerId);
    final profile = profileResult.when(success: (data) => data, failure: (error) => throw error);

    return (summary, profile);
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Customer details')),
      body: FutureBuilder<(CustomerSummary, CustomerProfile?)>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Could not load customer: ${snapshot.error}'));
          }

          final (summary, profile) = snapshot.data!;

          return Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(summary.fullName ?? 'Unnamed customer', style: textTheme.headlineMedium),
                const SizedBox(height: 8),
                if (summary.email != null) Text('Email: ${summary.email}', style: textTheme.bodyMedium),
                if (summary.phone != null) Text('Phone: ${summary.phone}', style: textTheme.bodyMedium),
                const SizedBox(height: 16),
                if (profile == null)
                  Text('No profile submitted yet.', style: textTheme.bodyMedium)
                else ...[
                  if (profile.addressLine1 != null)
                    Text('Address: ${profile.addressLine1}, ${profile.city ?? ''}', style: textTheme.bodyMedium),
                  if (profile.employmentStatus != null)
                    Text('Employment: ${profile.employmentStatus}', style: textTheme.bodyMedium),
                  if (profile.monthlyIncome != null)
                    Text('Monthly income: \$${profile.monthlyIncome}', style: textTheme.bodyMedium),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
