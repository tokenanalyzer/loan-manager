import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/skeleton_loader.dart';
import '../../core/widgets/state_views.dart';
import 'customers_controller.dart';

/// CRM: lists all customers, with a local name/email/phone filter.
class CustomerListScreen extends ConsumerStatefulWidget {
  const CustomerListScreen({super.key});

  @override
  ConsumerState<CustomerListScreen> createState() => _CustomerListScreenState();
}

class _CustomerListScreenState extends ConsumerState<CustomerListScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final customersAsync = ref.watch(customersControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Customers'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Search name, email, or phone',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: (value) => setState(() => _query = value.trim().toLowerCase()),
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(customersControllerProvider.notifier).refresh(),
        child: customersAsync.when(
          loading: () => ListView(
            padding: const EdgeInsets.all(16),
            children: const [
              SkeletonCard(lines: 2),
              SizedBox(height: 12),
              SkeletonCard(lines: 2),
            ],
          ),
          error: (error, _) => ErrorView(
            message: 'Could not load customers: $error',
            onRetry: () => ref.read(customersControllerProvider.notifier).refresh(),
          ),
          data: (customers) {
            final filtered = _query.isEmpty
                ? customers
                : customers.where((c) {
                    final haystack = [c.fullName, c.email, c.phone]
                        .whereType<String>()
                        .join(' ')
                        .toLowerCase();
                    return haystack.contains(_query);
                  }).toList();

            if (filtered.isEmpty) {
              return EmptyView(
                icon: Icons.people_outline,
                message: customers.isEmpty
                    ? 'No customers yet.'
                    : 'No customers match "$_query".',
              );
            }

            return ListView.separated(
              itemCount: filtered.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final customer = filtered[index];
                return ListTile(
                  title: Text(customer.fullName ?? customer.phone ?? customer.id),
                  subtitle: Text(customer.email ?? customer.phone ?? ''),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/customers/${customer.id}'),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
