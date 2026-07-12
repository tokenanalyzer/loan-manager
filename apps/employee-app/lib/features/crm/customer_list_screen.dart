import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/di/injection.dart';
import '../../core/models/customer_summary.dart';
import '../../core/network/customer_repository.dart';

/// CRM: lists all customers.
///
/// Phase 5 scope: a flat list, no search/pagination/filtering yet.
class CustomerListScreen extends StatefulWidget {
  const CustomerListScreen({super.key});

  @override
  State<CustomerListScreen> createState() => _CustomerListScreenState();
}

class _CustomerListScreenState extends State<CustomerListScreen> {
  late Future<List<CustomerSummary>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<CustomerSummary>> _load() async {
    final result = await getIt<CustomerRepository>().listCustomers();
    return result.when(
        success: (data) => data, failure: (error) => throw error);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customers')),
      body: FutureBuilder<List<CustomerSummary>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
                child: Text('Could not load customers: ${snapshot.error}'));
          }

          final customers = snapshot.data ?? [];
          if (customers.isEmpty) {
            return const Center(child: Text('No customers yet.'));
          }

          return ListView.separated(
            itemCount: customers.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final customer = customers[index];
              return ListTile(
                title: Text(customer.fullName ?? customer.phone ?? customer.id),
                subtitle: Text(customer.email ?? customer.phone ?? ''),
                onTap: () => context.push('/customers/${customer.id}'),
              );
            },
          );
        },
      ),
    );
  }
}
