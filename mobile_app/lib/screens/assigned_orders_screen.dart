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

  // Skeuomorphic Theme Colors
  static const Color kBgColor = Color(0xFFE8E0D5);
  static const Color kCardColor = Color(0xFFF5F0E8);
  static const Color kPrimaryColor = Color(0xFF8B4513);
  static const Color kAccentColor = Color(0xFFCD853F);
  static const Color kSecondaryColor = Color(0xFF6B4423);
  static const Color kTextColor = Color(0xFF3E2723);
  static const Color kSubTextColor = Color(0xFF795548);
  static const Color kHighlightColor = Color(0xFFFFFBF5);
  static const Color kShadowColor = Color(0xFF5D4037);

  // Skeuomorphic helper methods
  BoxDecoration _skeuoEmbossedDecoration({Color? baseColor, double radius = 16}) {
    final color = baseColor ?? kCardColor;
    return BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: kHighlightColor.withOpacity(0.5), width: 1),
      boxShadow: [
        BoxShadow(
          color: kShadowColor.withOpacity(0.25),
          blurRadius: 8,
          offset: const Offset(4, 4),
        ),
        BoxShadow(
          color: kHighlightColor.withOpacity(0.9),
          blurRadius: 8,
          offset: const Offset(-3, -3),
        ),
      ],
    );
  }

  BoxDecoration _skeuoDebossedDecoration({Color? baseColor, double radius = 12}) {
    final color = baseColor ?? kBgColor;
    return BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: kShadowColor.withOpacity(0.15), width: 1),
      boxShadow: [
        BoxShadow(
          color: kShadowColor.withOpacity(0.15),
          blurRadius: 4,
          offset: const Offset(2, 2),
        ),
        BoxShadow(
          color: kHighlightColor.withOpacity(0.5),
          blurRadius: 4,
          offset: const Offset(-1, -1),
        ),
      ],
    );
  }

  BoxDecoration _skeuoButtonDecoration(Color color, {bool pressed = false}) {
    if (pressed) {
      return BoxDecoration(
        color: color.withOpacity(0.9),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.black.withOpacity(0.2), width: 1),
      );
    }
    return BoxDecoration(
      gradient: LinearGradient(
        colors: [
          color.withOpacity(1.0),
          Color.lerp(color, Colors.black, 0.2)!,
        ],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: Colors.black.withOpacity(0.3), width: 1),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withOpacity(0.4),
          blurRadius: 4,
          offset: const Offset(2, 3),
        ),
        BoxShadow(
          color: Colors.white.withOpacity(0.2),
          blurRadius: 1,
          offset: const Offset(-1, -1),
        ),
      ],
    );
  }

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
        leading: Container(
          margin: const EdgeInsets.all(8),
          decoration: _skeuoEmbossedDecoration(radius: 10),
          child: IconButton(
            icon: const Icon(Icons.arrow_back_rounded, color: kPrimaryColor, size: 20),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Assigned Orders',
              style: TextStyle(
                color: kTextColor,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                shadows: [
                  Shadow(
                    color: kHighlightColor.withOpacity(0.9),
                    offset: const Offset(1, 1),
                  ),
                ],
              ),
            ),
            Text(
              '${_items.length} assignments',
              style: TextStyle(color: kSubTextColor, fontSize: 12),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.all(8),
            decoration: _skeuoEmbossedDecoration(radius: 10),
            child: IconButton(
              icon: _isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: kPrimaryColor),
                    )
                  : const Icon(Icons.refresh_rounded, color: kSecondaryColor, size: 20),
              onPressed: _isLoading ? null : _loadData,
            ),
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
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: isSelected
            ? _skeuoButtonDecoration(kPrimaryColor)
            : _skeuoEmbossedDecoration(radius: 20),
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
      decoration: _skeuoEmbossedDecoration(radius: 18),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          childrenPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          leading: Container(
            padding: const EdgeInsets.all(10),
            decoration: _skeuoDebossedDecoration(
              baseColor: _getTypeColor(item.type).withOpacity(0.15),
              radius: 12,
            ),
            child: Icon(
              _getTypeIcon(item.type),
              color: _getTypeColor(item.type).withOpacity(0.8),
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
                decoration: _skeuoDebossedDecoration(
                  baseColor: _getStatusColor(item.agentStatus).withOpacity(0.15),
                  radius: 12,
                ),
                child: Text(
                  item.agentStatus.replaceAll('_', ' ').toUpperCase(),
                  style: TextStyle(
                    color: _getStatusColor(item.agentStatus).withOpacity(0.8),
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
                              horizontal: 12, vertical: 8),
                          decoration: _skeuoButtonDecoration(const Color(0xFF2E7D32)),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.phone_rounded,
                                  size: 14, color: Colors.white),
                              SizedBox(width: 4),
                              Text(
                                'Call',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
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
                              horizontal: 12, vertical: 8),
                          decoration: _skeuoButtonDecoration(kPrimaryColor),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.chat_rounded,
                                  size: 14, color: Colors.white),
                              SizedBox(width: 4),
                              Text(
                                'Chat',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
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
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: isSelected 
                          ? _skeuoButtonDecoration(kPrimaryColor) 
                          : _skeuoDebossedDecoration(radius: 8),
                        child: Text(
                          status.replaceAll('_', ' ').toUpperCase(),
                          style: TextStyle(
                            color: isSelected ? Colors.white : kSubTextColor,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
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
