import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import 'chat_screen.dart';

class AssignedOrdersScreen extends StatefulWidget {
  const AssignedOrdersScreen({super.key});

  @override
  State<AssignedOrdersScreen> createState() => _AssignedOrdersScreenState();
}

class _AssignedOrdersScreenState extends State<AssignedOrdersScreen> {
  List<AssignedItem> _items = [];
  bool _isLoading = true;
  String? _error;
  String _statusFilter = 'all'; // all, pending, in_progress, completed

  static const Color kBgColor = Color(0xFFF8FAFC);
  static const Color kCardColor = Colors.white;
  static const Color kPrimaryColor = Color(0xFF2563EB);
  static const Color kSecondaryColor = Color(0xFF64748B);
  static const Color kTextColor = Color(0xFF1E293B);
  static const Color kSubTextColor = Color(0xFF94A3B8);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);
      final items = await apiService.getAssignedItems();

      if (mounted) {
        setState(() {
          _items = items;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _updateStatus(AssignedItem item, String newStatus) async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);

      await apiService.updateItemStatus(
        id: item.id,
        type: item.type,
        status: newStatus,
        notes: item.agentNotes,
        agreedTo: item.agreedTo,
      );

      setState(() {
        final index = _items.indexWhere((i) => i.id == item.id);
        if (index != -1) {
          _items[index] = item.copyWith(agentStatus: newStatus);
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status updated to $newStatus')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _updateNotes(AssignedItem item, String notes) async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);

      await apiService.updateItemStatus(
        id: item.id,
        type: item.type,
        status: item.agentStatus,
        notes: notes,
        agreedTo: item.agreedTo,
      );

      setState(() {
        final index = _items.indexWhere((i) => i.id == item.id);
        if (index != -1) {
          _items[index] = item.copyWith(agentNotes: notes);
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving notes: $e')),
        );
      }
    }
  }

  Future<void> _updateAgreedTo(AssignedItem item, DateTime? agreedTo) async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);

      await apiService.updateItemStatus(
        id: item.id,
        type: item.type,
        status: item.agentStatus,
        notes: item.agentNotes,
        agreedTo: agreedTo,
      );

      setState(() {
        final index = _items.indexWhere((i) => i.id == item.id);
        if (index != -1) {
          _items[index] = item.copyWith(agreedTo: agreedTo);
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Agreed date updated')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _makeCall(String phone) async {
    String number = phone.trim();
    if (number.startsWith('91') && number.length == 12) {
      number = number.substring(2);
    }
    final uri = Uri.parse('tel:$number');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  List<AssignedItem> get _filteredItems {
    if (_statusFilter == 'all') return _items;
    return _items.where((item) => item.agentStatus == _statusFilter).toList();
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'completed':
        return const Color(0xFF22C55E);
      case 'in_progress':
        return const Color(0xFF3B82F6);
      case 'cancelled':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFFF59E0B);
    }
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'order':
        return const Color(0xFFF97316);
      case 'flow':
        return const Color(0xFF22C55E);
      default:
        return const Color(0xFF3B82F6);
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'order':
        return Icons.shopping_cart_rounded;
      case 'flow':
        return Icons.description_rounded;
      default:
        return Icons.message_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kBgColor,
      appBar: AppBar(
        backgroundColor: kCardColor,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: kTextColor),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Assigned Orders',
              style: TextStyle(
                color: kTextColor,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              '${_items.length} assignments',
              style: const TextStyle(color: kSubTextColor, fontSize: 12),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh_rounded, color: kSecondaryColor),
            onPressed: _isLoading ? null : _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Error: $_error'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Filter chips
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildFilterChip('All', 'all'),
                            const SizedBox(width: 8),
                            _buildFilterChip('Pending', 'pending'),
                            const SizedBox(width: 8),
                            _buildFilterChip('In Progress', 'in_progress'),
                            const SizedBox(width: 8),
                            _buildFilterChip('Completed', 'completed'),
                          ],
                        ),
                      ),
                    ),
                    // List
                    Expanded(
                      child: _filteredItems.isEmpty
                          ? Center(
                              child: Text(
                                'No ${_statusFilter != 'all' ? _statusFilter.replaceAll('_', ' ') : ''} items found',
                                style: const TextStyle(color: kSubTextColor),
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _loadData,
                              child: ListView.separated(
                                padding: const EdgeInsets.all(16),
                                itemCount: _filteredItems.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 12),
                                itemBuilder: (context, index) =>
                                    _buildItemCard(_filteredItems[index]),
                              ),
                            ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _statusFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _statusFilter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? kPrimaryColor : kCardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? kPrimaryColor : const Color(0xFFE5E7EB),
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: kPrimaryColor.withOpacity(0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : kSecondaryColor,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildItemCard(AssignedItem item) {
    return Container(
      decoration: BoxDecoration(
        color: kCardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          childrenPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _getTypeColor(item.type).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              _getTypeIcon(item.type),
              color: _getTypeColor(item.type),
              size: 22,
            ),
          ),
          title: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      style: const TextStyle(
                        color: kTextColor,
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.phone,
                      style: const TextStyle(
                        color: kSubTextColor,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _getStatusColor(item.agentStatus).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  item.agentStatus.replaceAll('_', ' ').toUpperCase(),
                  style: TextStyle(
                    color: _getStatusColor(item.agentStatus),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => _makeCall(item.phone),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFF22C55E).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.phone_rounded,
                                  size: 14, color: Color(0xFF22C55E)),
                              SizedBox(width: 4),
                              Text(
                                'Call',
                                style: TextStyle(
                                  color: Color(0xFF22C55E),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        onTap: () {
                          final lead = Lead(
                            id: item.id,
                            name: item.name,
                            phone: item.phone,
                          );
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ChatScreen(lead: lead),
                            ),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: kPrimaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.chat_rounded,
                                  size: 14, color: kPrimaryColor),
                              SizedBox(width: 4),
                              Text(
                                'Chat',
                                style: TextStyle(
                                  color: kPrimaryColor,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          children: [
            // Status buttons
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'UPDATE STATUS',
                  style: TextStyle(
                    color: kSubTextColor,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    'pending',
                    'in_progress',
                    'completed',
                    'cancelled'
                  ].map((status) {
                    final isSelected = item.agentStatus == status;
                    return GestureDetector(
                      onTap: () => _updateStatus(item, status),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? kPrimaryColor
                              : kBgColor,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color:
                                isSelected ? kPrimaryColor : const Color(0xFFE5E7EB),
                          ),
                        ),
                        child: Text(
                          status.replaceAll('_', ' ').toUpperCase(),
                          style: TextStyle(
                            color: isSelected ? Colors.white : kSecondaryColor,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 16),
                // Notes
                const Text(
                  'NOTES',
                  style: TextStyle(
                    color: kSubTextColor,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  initialValue: item.agentNotes ?? '',
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: 'Add notes...',
                    hintStyle: const TextStyle(color: kSubTextColor),
                    filled: true,
                    fillColor: kBgColor,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: kPrimaryColor),
                    ),
                  ),
                  onChanged: (value) {
                    // Debounced update
                    Future.delayed(const Duration(milliseconds: 500), () {
                      _updateNotes(item, value);
                    });
                  },
                ),
                const SizedBox(height: 16),
                // Agreed To Date
                const Text(
                  'CUSTOMER AGREED TO',
                  style: TextStyle(
                    color: kSubTextColor,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      initialDate: item.agreedTo ?? DateTime.now(),
                      firstDate: DateTime.now().subtract(const Duration(days: 365)),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                    );
                    if (date != null && mounted) {
                      final time = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay.fromDateTime(
                            item.agreedTo ?? DateTime.now()),
                      );
                      if (time != null) {
                        final agreedTo = DateTime(
                          date.year,
                          date.month,
                          date.day,
                          time.hour,
                          time.minute,
                        );
                        _updateAgreedTo(item, agreedTo);
                      }
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: kBgColor,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE5E7EB)),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.calendar_today_rounded,
                          size: 18,
                          color: item.agreedTo != null
                              ? const Color(0xFF22C55E)
                              : kSubTextColor,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          item.agreedTo != null
                              ? DateFormat('MMM d, yyyy h:mm a')
                                  .format(item.agreedTo!)
                              : 'Select date & time',
                          style: TextStyle(
                            color: item.agreedTo != null
                                ? kTextColor
                                : kSubTextColor,
                            fontSize: 14,
                          ),
                        ),
                        const Spacer(),
                        if (item.agreedTo != null)
                          GestureDetector(
                            onTap: () => _updateAgreedTo(item, null),
                            child: const Icon(
                              Icons.close_rounded,
                              size: 18,
                              color: kSubTextColor,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Assigned on ${DateFormat('MMM d, h:mm a').format(item.receivedAt)}',
                  style: const TextStyle(color: kSubTextColor, fontSize: 11),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
