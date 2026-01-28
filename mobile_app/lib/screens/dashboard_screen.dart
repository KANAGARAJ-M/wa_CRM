import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import 'login_screen.dart';
import 'chat_screen.dart';
import 'call_log_screen.dart';
import 'dialer_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;
  List<Lead> _leads = [];
  List<CallLog> _calls = [];
  List<CallLog> _followUps = [];
  WorkerStats? _stats;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData({bool showLoading = true}) async {
    if (showLoading) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);

      final results = await Future.wait([
        apiService.getLeads(),
        apiService.getStats(),
        apiService.getCalls(),
        apiService.getFollowUps(),
      ]);

      if (mounted) {
        setState(() {
          _leads = results[0] as List<Lead>;
          _stats = results[1] as WorkerStats;
          _calls = results[2] as List<CallLog>;
          _followUps = results[3] as List<CallLog>;
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

  Future<void> _handleRefresh() async {
    await _loadData(showLoading: false);
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

  void _logout() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    await authService.logout();
    if (mounted) {
      Navigator.pushReplacement(
          context, MaterialPageRoute(builder: (_) => const LoginScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final userName = authService.user?['name'] ?? 'Agent';

    String companyName = 'Agent Portal';
    if (authService.user != null && authService.user!['companies'] != null) {
      final companies = authService.user!['companies'];
      if (companies is List && companies.isNotEmpty) {
        if (companies[0] is Map) {
          companyName = companies[0]['name'] ?? 'Agent Portal';
        }
      }
    }

    return Scaffold(
      backgroundColor:
          const Color(0xFF111827), // Dark background for modern look
      body: SafeArea(
        child: Column(
          children: [
            // Custom Header
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        companyName,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.6),
                          fontSize: 14,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Hello, $userName',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () => _loadData(showLoading: true),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.refresh_rounded,
                              color: Colors.white, size: 20),
                        ),
                      ),
                      const SizedBox(width: 12),
                      GestureDetector(
                        onTap: _logout,
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.logout_rounded,
                              color: Colors.white, size: 20),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Stats Carousel (Manual Implementation)
            if (_stats != null)
              SizedBox(
                height: 140,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  children: [
                    _buildModernStatCard(
                      'Today\'s Calls',
                      '${_stats!.todayCalls}',
                      const Color(0xFF8B5CF6),
                      Icons.phone_callback_rounded,
                    ),
                    const SizedBox(width: 16),
                    _buildModernStatCard(
                      'Conversions',
                      '${_stats!.conversions}',
                      const Color(0xFF10B981),
                      Icons.check_circle_outline_rounded,
                    ),
                    const SizedBox(width: 16),
                    _buildModernStatCard(
                      'Total Leads',
                      '${_stats!.totalLeads}',
                      const Color(0xFF3B82F6),
                      Icons.people_outline_rounded,
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 32),

            // Custom Tab Switcher
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 24),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  _buildTabButton(0, 'Leads'),
                  _buildTabButton(1, 'Calls'),
                  _buildTabButton(2, 'Follow-ups'),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Content Area
            Expanded(
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(32),
                    topRight: Radius.circular(32),
                  ),
                ),
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : _error != null
                        ? Center(child: Text('Error: $_error'))
                        : ClipRRect(
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(32),
                              topRight: Radius.circular(32),
                            ),
                            child: _buildSelectedView(),
                          ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const DialerScreen()),
          );
        },
        backgroundColor: const Color(0xFF111827),
        child: const Icon(Icons.dialpad_rounded, color: Colors.white),
      ),
    );
  }

  Widget _buildTabButton(int index, String text) {
    final isSelected = _selectedIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedIndex = index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF10B981) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected ? Colors.white : Colors.grey,
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildModernStatCard(
      String title, String value, Color color, IconData icon) {
    return Container(
      width: 140,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(0.4),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.white, size: 20),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSelectedView() {
    switch (_selectedIndex) {
      case 0:
        return _buildLeadsList();
      case 1:
        return _buildCallsList();
      case 2:
        return _buildFollowUpsList();
      default:
        return const SizedBox();
    }
  }

  Widget _buildLeadsList() {
    return RefreshIndicator(
      onRefresh: _handleRefresh,
      color: const Color(0xFF10B981),
      child: _leads.isEmpty
          ? SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: MediaQuery.of(context).size.height * 0.6,
                child: _buildEmptyState('No leads assigned'),
              ),
            )
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24),
              itemCount: _leads.length,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) =>
                  _buildModernLeadItem(_leads[index]),
            ),
    );
  }

  Widget _buildCallsList() {
    return RefreshIndicator(
      onRefresh: _handleRefresh,
      color: const Color(0xFF10B981),
      child: _calls.isEmpty
          ? SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: MediaQuery.of(context).size.height * 0.6,
                child: _buildEmptyState('No call history'),
              ),
            )
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24),
              itemCount: _calls.length,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) =>
                  _buildModernCallItem(_calls[index]),
            ),
    );
  }

  Widget _buildFollowUpsList() {
    return RefreshIndicator(
      onRefresh: _handleRefresh,
      color: const Color(0xFF10B981),
      child: _followUps.isEmpty
          ? SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SizedBox(
                height: MediaQuery.of(context).size.height * 0.6,
                child: _buildEmptyState('No pending follow-ups'),
              ),
            )
          : ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(24),
              itemCount: _followUps.length,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) =>
                  _buildModernCallItem(_followUps[index]),
            ),
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.info_outline, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(
            message,
            style: TextStyle(color: Colors.grey[500], fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildModernLeadItem(Lead lead) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: const Color(0xFFF3F4F6),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Center(
              child: Text(
                lead.name[0].toUpperCase(),
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827),
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  lead.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  lead.phone,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[500],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Row(
            children: [
              _buildIconBtn(Icons.chat_bubble_outline_rounded, Colors.blue, () {
                Navigator.push(context,
                    MaterialPageRoute(builder: (_) => ChatScreen(lead: lead)));
              }),
              const SizedBox(width: 12),
              _buildIconBtn(Icons.phone_rounded, Colors.green, () {
                _makeCall(lead.phone);
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => CallLogScreen(lead: lead)));
              }),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildModernCallItem(CallLog call) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: _getOutcomeColor(call.outcome).withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              _getOutcomeIcon(call.outcome),
              color: _getOutcomeColor(call.outcome),
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  call.leadName ?? 'Unknown',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  DateFormat('MMM d, h:mm a').format(call.createdAt),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: _getStatusColor(call.status).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              call.outcome.toUpperCase(),
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: _getStatusColor(call.status),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIconBtn(IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(icon, color: color, size: 20),
      ),
    );
  }

  IconData _getOutcomeIcon(String outcome) {
    switch (outcome.toLowerCase()) {
      case 'interested':
        return Icons.thumb_up_rounded;
      case 'not-interested':
        return Icons.thumb_down_rounded;
      case 'follow-up':
        return Icons.calendar_today_rounded;
      case 'callback':
        return Icons.phone_callback_rounded;
      case 'converted':
        return Icons.check_circle_rounded;
      case 'wrong-number':
        return Icons.phonelink_erase_rounded;
      default:
        return Icons.phone_rounded;
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'new':
        return Colors.blue;
      case 'contacted':
        return Colors.orange;
      case 'interested':
        return Colors.green;
      case 'converted':
        return Colors.purple;
      case 'closed':
        return Colors.grey;
      case 'completed':
        return Colors.green;
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
      default:
        return Colors.grey;
    }
  }
}
