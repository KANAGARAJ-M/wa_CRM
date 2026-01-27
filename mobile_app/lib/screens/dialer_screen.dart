import 'package:flutter/material.dart';
import 'package:flutter_phone_direct_caller/flutter_phone_direct_caller.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import 'call_log_screen.dart';
import 'call_screen.dart';

class DialerScreen extends StatefulWidget {
  const DialerScreen({super.key});

  @override
  State<DialerScreen> createState() => _DialerScreenState();
}

class _DialerScreenState extends State<DialerScreen> with SingleTickerProviderStateMixin {
  final TextEditingController _numberController = TextEditingController();
  late TabController _tabController;
  List<Lead> _leads = [];
  List<CallLog> _callHistory = [];
  Map<String, int> _stats = {'new': 0, 'contacted': 0, 'interested': 0};
  bool _isLoading = true;
  String _selectedFilter = 'all';
  String? _activeLeadId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchData();
  }

  @override
  void dispose() {
    _numberController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);
      
      final results = await Future.wait([
        apiService.getLeads(),
        apiService.getCalls(),
      ]);
      
      final leads = results[0] as List<Lead>;
      final calls = results[1] as List<CallLog>;
      
      // Calculate stats
      final stats = <String, int>{'new': 0, 'contacted': 0, 'interested': 0};
      for (final lead in leads) {
        final status = lead.status?.toLowerCase() ?? 'new';
        if (stats.containsKey(status)) {
          stats[status] = (stats[status] ?? 0) + 1;
        }
      }
      
      setState(() {
        _leads = leads;
        _callHistory = calls;
        _stats = stats;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading data: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _onDigitPress(String digit) {
    setState(() {
      _numberController.text += digit;
    });
  }

  void _onBackspace() {
    if (_numberController.text.isNotEmpty) {
      setState(() {
        _numberController.text = _numberController.text.substring(0, _numberController.text.length - 1);
      });
    }
  }

  void _clearNumber() {
    setState(() {
      _numberController.text = '';
    });
  }

  Future<void> _makeCall({Lead? lead}) async {
    final number = lead?.phone ?? _numberController.text;
    if (number.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a phone number'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() {
      _activeLeadId = lead?.id;
      if (lead != null) {
        _numberController.text = lead.phone;
      }
    });

    // Make the call using CallScreen
    if (lead != null) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => CallScreen(lead: lead)),
      );
    } else {
      // For manual number entry, just call directly for now (or create temp lead)
      try {
        await FlutterPhoneDirectCaller.callNumber(number);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error making call: $e'), backgroundColor: Colors.red),
          );
        }
      }
    }
  }

  void _showCallOutcomeDialog(Lead lead) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CallOutcomeSheet(
        lead: lead,
        onOutcomeSelected: (outcome, notes, duration, followUpDate, followUpNotes, priority, product, location, businessDetails, orderStatus) async {
          Navigator.pop(context);
          await _saveCallOutcome(lead, outcome, notes, duration, followUpDate, followUpNotes, priority, product, location, businessDetails, orderStatus);
        },
      ),
    );
  }

  Future<void> _saveCallOutcome(
    Lead lead, 
    String outcome, 
    String? notes, 
    int duration,
    String? followUpDate,
    String? followUpNotes,
    String priority,
    String? product,
    String? location,
    String? businessDetails,
    String? orderStatus,
  ) async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);
      
      await apiService.logCall(
        leadId: lead.id,
        phoneNumber: lead.phone,
        leadName: lead.name,
        status: 'completed',
        outcome: outcome,
        duration: duration,
        notes: notes,
        followUpDate: followUpDate,
        followUpNotes: followUpNotes,
        priority: priority,
        product: product,
        location: location,
        businessDetails: businessDetails,
        orderStatus: orderStatus,
      );

      await _fetchData();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Call outcome saved: ${outcome.toUpperCase()}'),
            backgroundColor: Colors.green,
          ),
        );
      }

      setState(() {
        _activeLeadId = null;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving outcome: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF1F2937)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Call Center',
          style: TextStyle(color: Color(0xFF1F2937), fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF6B7280)),
            onPressed: _fetchData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF22C55E),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFF22C55E),
          tabs: const [
            Tab(icon: Icon(Icons.dialpad), text: 'Keypad'),
            Tab(icon: Icon(Icons.assignment), text: 'My Leads'),
            Tab(icon: Icon(Icons.history), text: 'History'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildKeypadTab(),
          _buildLeadsTab(),
          _buildHistoryTab(),
        ],
      ),
    );
  }

  Widget _buildKeypadTab() {
    return Column(
      children: [
        // Display Area
        Expanded(
          flex: 2,
          child: Container(
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _numberController.text.isEmpty ? 'Enter number' : _numberController.text,
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                      color: _numberController.text.isEmpty ? Colors.grey : const Color(0xFF1F2937),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Keypad
        Expanded(
          flex: 4,
          child: Container(
            padding: const EdgeInsets.only(bottom: 32, left: 16, right: 16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildRow(['1', '2', '3']),
                _buildRow(['4', '5', '6']),
                _buildRow(['7', '8', '9']),
                _buildRow(['*', '0', '#']),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    const SizedBox(width: 80),
                    // Call Button
                    GestureDetector(
                      onTap: () => _makeCall(),
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Colors.green, Colors.green.shade700],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.green.withOpacity(0.4),
                              blurRadius: 15,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.call, color: Colors.white, size: 36),
                      ),
                    ),
                    // Backspace
                    SizedBox(
                      width: 80,
                      child: IconButton(
                        onPressed: _onBackspace,
                        onLongPress: _clearNumber,
                        icon: const Icon(Icons.backspace_outlined),
                        iconSize: 28,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRow(List<String> digits) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: digits.map((digit) => _buildDigitButton(digit)).toList(),
    );
  }

  Widget _buildDigitButton(String digit) {
    String subLabel = '';
    if (digit == '2') subLabel = 'ABC';
    if (digit == '3') subLabel = 'DEF';
    if (digit == '4') subLabel = 'GHI';
    if (digit == '5') subLabel = 'JKL';
    if (digit == '6') subLabel = 'MNO';
    if (digit == '7') subLabel = 'PQRS';
    if (digit == '8') subLabel = 'TUV';
    if (digit == '9') subLabel = 'WXYZ';

    return GestureDetector(
      onTap: () => _onDigitPress(digit),
      child: Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.grey[100],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              digit,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w500),
            ),
            if (subLabel.isNotEmpty)
              Text(
                subLabel,
                style: TextStyle(fontSize: 10, color: Colors.grey[600], letterSpacing: 1),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLeadsTab() {
    return Column(
      children: [
        // Stats Cards
        Container(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              _buildStatCard('New', _stats['new'] ?? 0, Colors.blue),
              const SizedBox(width: 8),
              _buildStatCard('Contacted', _stats['contacted'] ?? 0, Colors.orange),
              const SizedBox(width: 8),
              _buildStatCard('Interested', _stats['interested'] ?? 0, Colors.green),
            ],
          ),
        ),

        // Filter
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              _buildFilterChip('all', 'All'),
              const SizedBox(width: 8),
              _buildFilterChip('new', 'New'),
              const SizedBox(width: 8),
              _buildFilterChip('contacted', 'Contacted'),
              const SizedBox(width: 8),
              _buildFilterChip('follow-up', 'Follow Up'),
            ],
          ),
        ),

        const SizedBox(height: 8),

        // Leads List
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF22C55E)))
              : _leads.isEmpty
                  ? _buildEmptyState()
                  : RefreshIndicator(
                      onRefresh: _fetchData,
                      color: const Color(0xFF22C55E),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _leads.length,
                        itemBuilder: (context, index) {
                          final lead = _leads[index];
                          final status = lead.status?.toLowerCase() ?? 'new';
                          
                          // Apply filter
                          if (_selectedFilter != 'all' && status != _selectedFilter) {
                            return const SizedBox.shrink();
                          }

                          return _buildLeadCard(lead);
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String label, int count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Text(
              count.toString(),
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color),
            ),
            Text(
              label,
              style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String value, String label) {
    final isSelected = _selectedFilter == value;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        setState(() => _selectedFilter = selected ? value : 'all');
      },
      selectedColor: const Color(0xFF22C55E).withOpacity(0.2),
      checkmarkColor: const Color(0xFF22C55E),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.phone_disabled, size: 48, color: Colors.grey[400]),
          ),
          const SizedBox(height: 16),
          Text(
            'No leads assigned',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[700]),
          ),
          const SizedBox(height: 8),
          Text(
            'Contact your admin for lead assignments',
            style: TextStyle(color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildLeadCard(Lead lead) {
    final isActive = _activeLeadId == lead.id;
    final status = lead.status?.toLowerCase() ?? 'new';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFF22C55E).withOpacity(0.05) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isActive ? const Color(0xFF22C55E) : Colors.grey[200]!,
          width: isActive ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showCallOutcomeDialog(lead),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF22C55E), Color(0xFF14B8A6)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: Text(
                      lead.name[0].toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                const SizedBox(width: 16),

                // Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lead.name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(Icons.phone_android, size: 14, color: Colors.grey[600]),
                          const SizedBox(width: 4),
                          Text(lead.phone, style: TextStyle(color: Colors.grey[600])),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: _getStatusColor(status).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              status.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: _getStatusColor(status),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Source Indicator
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: (lead.source == 'whatsapp') 
                                  ? const Color(0xFF25D366).withOpacity(0.1) 
                                  : Colors.blue.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  (lead.source == 'whatsapp') ? Icons.chat : Icons.table_chart,
                                  size: 10,
                                  color: (lead.source == 'whatsapp') 
                                      ? const Color(0xFF25D366) 
                                      : Colors.blue,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  (lead.source == 'whatsapp') ? 'WhatsApp' : 'Excel',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: (lead.source == 'whatsapp') 
                                        ? const Color(0xFF25D366) 
                                        : Colors.blue,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      GestureDetector(
                        onTap: () => _showLeadHistory(lead),
                        child: Row(
                          children: [
                            const Icon(Icons.history, size: 14, color: Color(0xFF22C55E)),
                            const SizedBox(width: 4),
                            const Text(
                              'View History',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF22C55E),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Call Button
                GestureDetector(
                  onTap: () => _makeCall(lead: lead),
                  child: Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.green, Colors.green.shade700],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.green.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.call, color: Colors.white, size: 24),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (_callHistory.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'No call history',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              'Your recent calls will appear here',
              style: TextStyle(color: Colors.grey[500]),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchData,
      color: const Color(0xFF22C55E),
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _callHistory.length,
        itemBuilder: (context, index) {
          final call = _callHistory[index];
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: _getStatusColor(call.status ?? 'completed').withOpacity(0.1),
                child: Icon(
                  Icons.phone_callback,
                  color: _getStatusColor(call.status ?? 'completed'),
                ),
              ),
              title: Text(
                call.leadName ?? 'Unknown',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${call.phoneNumber} • ${call.createdAt != null ? DateFormat('MMM d, h:mm a').format(call.createdAt!) : ''}',
                    style: const TextStyle(fontSize: 12),
                  ),
                  if (call.notes != null && call.notes!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        call.notes!,
                        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  if (call.workerName != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Row(
                        children: [
                          const Icon(Icons.person_outline, size: 12, color: Colors.grey),
                          const SizedBox(width: 4),
                          Text(
                            'Agent: ${call.workerName}',
                            style: TextStyle(fontSize: 11, color: Colors.grey[600], fontStyle: FontStyle.italic),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _getOutcomeColor(call.outcome ?? 'other').withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  (call.outcome ?? 'other').toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: _getOutcomeColor(call.outcome ?? 'other'),
                  ),
                ),
              ),
              onTap: () {
                // Find the lead and make a call
                final lead = _leads.firstWhere(
                  (l) => l.phone == call.phoneNumber,
                  orElse: () => Lead(id: '', name: call.leadName ?? 'Unknown', phone: call.phoneNumber),
                );
                _makeCall(lead: lead);
              },
            ),
          );
        },
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'new':
        return Colors.blue;
      case 'contacted':
        return Colors.blueGrey;
      case 'interested':
        return Colors.green;
      case 'converted':
        return Colors.purple;
      case 'closed':
        return Colors.black;
      case 'follow-up':
        return Colors.orange;
      case 'not-interested':
        return Colors.red;
      case 'negotiation':
        return Colors.deepPurple;
      case 'completed':
        return Colors.green;
      case 'missed':
        return Colors.red;
      case 'no-answer':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  Color _getOutcomeColor(String outcome) {
    switch (outcome.toLowerCase()) {
      case 'interested':
        return Colors.green;
      case 'not-interested':
        return Colors.red;
      case 'follow-up':
        return Colors.blue;
      case 'callback':
        return Colors.orange;
      case 'converted':
        return Colors.purple;
      case 'wrong-number':
        return Colors.grey;
      default:
        return Colors.blueGrey;
    }
  }

  Future<void> _showLeadHistory(Lead lead) async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);
      
      // Fetch calls for this specific lead
      final history = await apiService.getCalls(leadId: lead.id, limit: 50);
      
      if (!mounted) return;

      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => Container(
          height: MediaQuery.of(context).size.height * 0.75,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 16),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFF22C55E).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          lead.name[0].toUpperCase(),
                          style: const TextStyle(color: Color(0xFF22C55E), fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'History: ${lead.name}',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            lead.phone,
                            style: TextStyle(color: Colors.grey[600], fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: history.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.history, size: 48, color: Colors.grey[300]),
                            const SizedBox(height: 16),
                            Text(
                              'No history found',
                              style: TextStyle(color: Colors.grey[500], fontSize: 16),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: history.length,
                        itemBuilder: (context, index) {
                          final call = history[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.grey[50],
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey[200]!),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      DateFormat('MMM d, yyyy h:mm a').format(call.createdAt),
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: _getOutcomeColor(call.outcome).withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        call.outcome.toUpperCase(),
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: _getOutcomeColor(call.outcome),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                if (call.workerName != null)
                                  Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.person_outline, size: 14, color: Colors.grey),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Agent: ${call.workerName}',
                                          style: TextStyle(fontSize: 12, color: Colors.grey[700], fontStyle: FontStyle.italic),
                                        ),
                                      ],
                                    ),
                                  ),
                                if (call.notes != null && call.notes!.isNotEmpty)
                                  Container(
                                    width: double.infinity,
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.grey[200]!),
                                    ),
                                    child: Text(
                                      call.notes!,
                                      style: TextStyle(color: Colors.grey[800], fontSize: 14),
                                    ),
                                  ),
                                if (call.location != null || call.businessDetails != null || call.orderStatus != null)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 12),
                                    child: Wrap(
                                      spacing: 12,
                                      runSpacing: 8,
                                      children: [
                                        if (call.location != null)
                                          _buildDetailChip(Icons.location_on, call.location!),
                                        if (call.businessDetails != null)
                                          _buildDetailChip(Icons.business, call.businessDetails!),
                                        if (call.orderStatus != null)
                                          _buildDetailChip(Icons.shopping_cart, call.orderStatus!.replaceAll('-', ' ')),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading history: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Widget _buildDetailChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: Colors.grey[600]),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(fontSize: 12, color: Colors.grey[800]),
          ),
        ],
      ),
    );
  }
}

// Call Outcome Bottom Sheet
class CallOutcomeSheet extends StatefulWidget {
  final Lead lead;
  final int? initialDuration;
  final Function(String outcome, String? notes, int duration, String? followUpDate, String? followUpNotes, String priority, String? product, String? location, String? businessDetails, String? orderStatus) onOutcomeSelected;

  const CallOutcomeSheet({
    super.key,
    required this.lead,
    this.initialDuration,
    required this.onOutcomeSelected,
  });

  @override
  State<CallOutcomeSheet> createState() => _CallOutcomeSheetState();
}

class _CallOutcomeSheetState extends State<CallOutcomeSheet> {
  String? _selectedOutcome;
  final TextEditingController _notesController = TextEditingController();
  late TextEditingController _durationController;
  final TextEditingController _followUpNotesController = TextEditingController();
  final TextEditingController _productController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _businessDetailsController = TextEditingController();
  String _orderStatus = 'not-ordered';
  DateTime? _followUpDate;
  String _priority = 'medium';

  @override
  void initState() {
    super.initState();
    _durationController = TextEditingController(text: (widget.initialDuration ?? 0).toString());
  }

  @override
  void dispose() {
    _notesController.dispose();
    _durationController.dispose();
    _followUpNotesController.dispose();
    _productController.dispose();
    _locationController.dispose();
    _businessDetailsController.dispose();
    super.dispose();
  }

  Future<void> _selectFollowUpDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.now(),
      );
      if (time != null) {
        setState(() {
          _followUpDate = DateTime(date.year, date.month, date.day, time.hour, time.minute);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Lead Info with Call Button
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF22C55E).withOpacity(0.1),
                      const Color(0xFF22C55E).withOpacity(0.05),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFF22C55E),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Center(
                        child: Text(
                          widget.lead.name[0].toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.lead.name,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.lead.phone,
                            style: TextStyle(color: Colors.grey[600], fontSize: 14),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: (widget.lead.source == 'whatsapp') 
                                  ? const Color(0xFF25D366).withOpacity(0.1) 
                                  : Colors.blue.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  (widget.lead.source == 'whatsapp') ? Icons.chat : Icons.table_chart,
                                  size: 10,
                                  color: (widget.lead.source == 'whatsapp') 
                                      ? const Color(0xFF25D366) 
                                      : Colors.blue,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  (widget.lead.source == 'whatsapp') ? 'WhatsApp Lead' : 'Excel Lead',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: (widget.lead.source == 'whatsapp') 
                                        ? const Color(0xFF25D366) 
                                        : Colors.blue,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Click to Call Button
                    GestureDetector(
                      onTap: () async {
                        await FlutterPhoneDirectCaller.callNumber(widget.lead.phone);
                      },
                      child: Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [Colors.green, Colors.green.shade700]),
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.green.withOpacity(0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.call, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Call Outcome
              const Text(
                'How did the call go?',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 12),

              // Outcome Buttons
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildOutcomeButton('contacted', 'Contacted', Icons.phone, Colors.blue),
                  _buildOutcomeButton('interested', 'Interested', Icons.thumb_up, Colors.green),
                  _buildOutcomeButton('not-interested', 'Not Interested', Icons.thumb_down, Colors.red),
                  _buildOutcomeButton('follow-up', 'Follow Up', Icons.schedule, Colors.orange),
                  _buildOutcomeButton('callback', 'Callback', Icons.phone_callback, Colors.blue),
                  _buildOutcomeButton('converted', 'Converted', Icons.star, Colors.teal),
                  _buildOutcomeButton('wrong-number', 'Wrong Number', Icons.phonelink_erase, Colors.grey),
                  _buildOutcomeButton('not-reachable', 'Not Reachable', Icons.signal_cellular_off, Colors.blueGrey),
                  _buildOutcomeButton('other', 'Other', Icons.help_outline, Colors.purple),
                ],
              ),

              const SizedBox(height: 20),

              // Duration
              TextField(
                controller: _durationController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Call Duration (seconds)',
                  prefixIcon: const Icon(Icons.timer),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),

              const SizedBox(height: 16),

              // Notes
              TextField(
                controller: _notesController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Add call notes (optional)...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF22C55E)),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Product Field
              TextField(
                controller: _productController,
                decoration: InputDecoration(
                  labelText: 'Product (optional)',
                  hintText: 'e.g., Solar Panel, Insurance...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  prefixIcon: const Icon(Icons.shopping_bag_outlined),
                ),
              ),
              const SizedBox(height: 16),

              // Location Field
              TextField(
                controller: _locationController,
                decoration: InputDecoration(
                  labelText: 'Location',
                  hintText: 'e.g., New York, NY',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  prefixIcon: const Icon(Icons.location_on_outlined),
                ),
              ),

              const SizedBox(height: 16),

              // Business Details Field
              TextField(
                controller: _businessDetailsController,
                decoration: InputDecoration(
                  labelText: 'Business Details',
                  hintText: 'e.g., Retail Store, Tech Startup...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey[300]!),
                  ),
                  prefixIcon: const Icon(Icons.business_outlined),
                ),
              ),

              const SizedBox(height: 16),

              // Order Status
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Order Status:', style: TextStyle(fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      _buildOrderStatusChip('not-ordered', 'Not Ordered', Colors.grey),
                      _buildOrderStatusChip('ordered', 'Ordered', Colors.green),
                      _buildOrderStatusChip('already-ordered', 'Already Ordered', Colors.blue),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 16),

              const SizedBox(height: 16),

              // Follow-up Date
              GestureDetector(
                onTap: _selectFollowUpDate,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey[300]!),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.calendar_today, color: Colors.grey[600]),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _followUpDate != null
                              ? DateFormat('MMM d, yyyy h:mm a').format(_followUpDate!)
                              : 'Schedule Follow-up (optional)',
                          style: TextStyle(
                            color: _followUpDate != null ? const Color(0xFF1F2937) : Colors.grey[500],
                          ),
                        ),
                      ),
                      if (_followUpDate != null)
                        IconButton(
                          icon: const Icon(Icons.clear, size: 20),
                          onPressed: () => setState(() => _followUpDate = null),
                        ),
                    ],
                  ),
                ),
              ),

              if (_followUpDate != null) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _followUpNotesController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    hintText: 'Follow-up notes (optional)...',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],

              const SizedBox(height: 16),

              // Priority
              // Priority
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 8.0),
                    child: Text('Priority: ', style: TextStyle(fontWeight: FontWeight.w500)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: ['low', 'medium', 'high', 'urgent'].map((p) => ChoiceChip(
                        label: Text(p.toUpperCase(), style: const TextStyle(fontSize: 11)),
                        selected: _priority == p,
                        onSelected: (_) => setState(() => _priority = p),
                        selectedColor: _getPriorityColor(p).withOpacity(0.2),
                        labelStyle: TextStyle(
                          color: _priority == p ? _getPriorityColor(p) : Colors.grey[600],
                          fontWeight: _priority == p ? FontWeight.bold : FontWeight.normal,
                        ),
                      )).toList(),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Actions
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _selectedOutcome == null
                          ? null
                          : () {
                              widget.onOutcomeSelected(
                                _selectedOutcome!,
                                _notesController.text.isNotEmpty ? _notesController.text : null,
                                int.tryParse(_durationController.text) ?? 0,
                                _followUpDate?.toIso8601String(),
                                _followUpNotesController.text.isNotEmpty ? _followUpNotesController.text : null,
                                _priority,
                                _productController.text.isNotEmpty ? _productController.text : null,
                                _locationController.text.isNotEmpty ? _locationController.text : null,
                                _businessDetailsController.text.isNotEmpty ? _businessDetailsController.text : null,
                                _orderStatus,
                              );
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF22C55E),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Save Outcome'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOutcomeButton(String value, String label, IconData icon, Color color) {
    final isSelected = _selectedOutcome == value;

    return GestureDetector(
      onTap: () => setState(() => _selectedOutcome = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? color : color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color, width: isSelected ? 2 : 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 18, color: isSelected ? Colors.white : color),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getPriorityColor(String priority) {
    switch (priority) {
      case 'low':
        return Colors.grey;
      case 'medium':
        return Colors.blue;
      case 'high':
        return Colors.orange;
      case 'urgent':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _buildOrderStatusChip(String value, String label, Color color) {
    final isSelected = _orderStatus == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _orderStatus = value),
      selectedColor: color.withOpacity(0.2),
      labelStyle: TextStyle(
        color: isSelected ? color : Colors.grey[600],
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      backgroundColor: Colors.grey[100],
    );
  }
}
