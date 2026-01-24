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

class _DashboardScreenState extends State<DashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Lead> _leads = [];
  List<CallLog> _calls = [];
  List<CallLog> _followUps = [];
  WorkerStats? _stats;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);

      final results = await Future.wait([
        apiService.getLeads(),
        apiService.getStats(),
        apiService.getCalls(),
        apiService.getFollowUps(),
      ]);

      setState(() {
        _leads = results[0] as List<Lead>;
        _stats = results[1] as WorkerStats;
        _calls = results[2] as List<CallLog>;
        _followUps = results[3] as List<CallLog>;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _makeCall(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _logout() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    await authService.logout();
    if (mounted) {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final userName = authService.user?['name'] ?? 'Worker';

    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF22C55E), Color(0xFF14B8A6)]),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(child: Text('W', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18))),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Worker Portal', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
                Text('Welcome, $userName', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.refresh, color: Color(0xFF6B7280)), onPressed: _loadData),
          IconButton(icon: const Icon(Icons.logout, color: Color(0xFFEF4444)), onPressed: _logout),
        ],
      ),
      body: Column(
        children: [
          // Stats
          if (_stats != null) _buildStatsSection(),
          
          // Tabs
          Container(
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)]),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(color: const Color(0xFF22C55E), borderRadius: BorderRadius.circular(10)),
              labelColor: Colors.white,
              unselectedLabelColor: Colors.grey[600],
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              tabs: const [
                Tab(text: 'Leads', icon: Icon(Icons.people, size: 20)),
                Tab(text: 'Calls', icon: Icon(Icons.phone, size: 20)),
                Tab(text: 'Follow-ups', icon: Icon(Icons.calendar_today, size: 20)),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF22C55E)))
                : _error != null
                    ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.error_outline, size: 48, color: Colors.red[300]),
                        const SizedBox(height: 16),
                        Text('Error loading data', style: TextStyle(color: Colors.grey[600])),
                        TextButton(onPressed: _loadData, child: const Text('Retry')),
                      ]))
                    : TabBarView(
                        controller: _tabController,
                        children: [_buildLeadsTab(), _buildCallsTab(), _buildFollowUpsTab()],
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const DialerScreen()));
        },
        backgroundColor: const Color(0xFF22C55E),
        icon: const Icon(Icons.dialpad, color: Colors.white),
        label: const Text('Dialer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _buildStatsSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          _buildStatCard('Today', '${_stats!.todayCalls}', Icons.phone_callback, const Color(0xFF3B82F6)),
          const SizedBox(width: 12),
          _buildStatCard('Total', '${_stats!.totalCalls}', Icons.phone, const Color(0xFF22C55E)),
          const SizedBox(width: 12),
          _buildStatCard('Leads', '${_stats!.totalLeads}', Icons.people, const Color(0xFF8B5CF6)),
          const SizedBox(width: 12),
          _buildStatCard('Conv.', '${_stats!.conversions}', Icons.check_circle, const Color(0xFF10B981)),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)]),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1F2937))),
            Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
          ],
        ),
      ),
    );
  }

  Widget _buildLeadsTab() {
    if (_leads.isEmpty) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.inbox, size: 64, color: Colors.grey[300]),
        const SizedBox(height: 16),
        Text('No leads assigned', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
      ]));
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _leads.length,
        itemBuilder: (context, index) {
          final lead = _leads[index];
          return _buildLeadCard(lead);
        },
      ),
    );
  }

  Widget _buildLeadCard(Lead lead) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)]),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 48, height: 48,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF6366F1)]),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Center(child: Text(lead.name[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18))),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(lead.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.phone, size: 14, color: Colors.grey[500]),
                        const SizedBox(width: 4),
                        Text(lead.phone, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
                      ],
                    ),
                    if (lead.updatedAt != null) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(Icons.access_time, size: 14, color: Colors.grey[400]),
                          const SizedBox(width: 4),
                          Text(DateFormat('MMM d, h:mm a').format(lead.updatedAt!), style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    _makeCall(lead.phone);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => CallLogScreen(lead: lead)));
                  },
                  icon: const Icon(Icons.phone, size: 18),
                  label: const Text('Call'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3B82F6),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(lead: lead))),
                  icon: const Icon(Icons.chat, size: 18),
                  label: const Text('Chat'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF22C55E),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCallsTab() {
    if (_calls.isEmpty) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.phone_disabled, size: 64, color: Colors.grey[300]),
        const SizedBox(height: 16),
        Text('No call history', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
      ]));
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _calls.length,
        itemBuilder: (context, index) => _buildCallCard(_calls[index]),
      ),
    );
  }

  Widget _buildCallCard(CallLog call) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)]),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF22C55E), Color(0xFF14B8A6)]),
              borderRadius: BorderRadius.circular(22),
            ),
            child: Center(child: Text((call.leadName ?? 'L')[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(call.leadName ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
                Text(call.phoneNumber, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
                const SizedBox(height: 6),
                Row(
                  children: [
                    _buildStatusChip(call.status),
                    const SizedBox(width: 6),
                    _buildOutcomeChip(call.outcome),
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(DateFormat('MMM d').format(call.createdAt), style: TextStyle(fontSize: 12, color: Colors.grey[500])),
              Text(DateFormat('h:mm a').format(call.createdAt), style: TextStyle(fontSize: 11, color: Colors.grey[400])),
              if (call.duration > 0) Text('${call.duration ~/ 60}:${(call.duration % 60).toString().padLeft(2, '0')}', style: TextStyle(fontSize: 11, color: Colors.grey[400])),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFollowUpsTab() {
    if (_followUps.isEmpty) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.check_circle, size: 64, color: Colors.green[300]),
        const SizedBox(height: 16),
        Text('No pending follow-ups', style: TextStyle(fontSize: 16, color: Colors.grey[600])),
      ]));
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _followUps.length,
        itemBuilder: (context, index) => _buildFollowUpCard(_followUps[index]),
      ),
    );
  }

  Widget _buildFollowUpCard(CallLog followUp) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)]),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFFF97316), Color(0xFFEF4444)]),
              borderRadius: BorderRadius.circular(22),
            ),
            child: Center(child: Text((followUp.leadName ?? 'L')[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(followUp.leadName ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF1F2937))),
                Text(followUp.phoneNumber, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
                if (followUp.followUpNotes != null) ...[
                  const SizedBox(height: 4),
                  Text(followUp.followUpNotes!, style: TextStyle(fontSize: 12, color: Colors.grey[500]), maxLines: 2, overflow: TextOverflow.ellipsis),
                ],
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (followUp.followUpDate != null) ...[
                Text(DateFormat('MMM d').format(followUp.followUpDate!), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFF97316))),
                Text(DateFormat('h:mm a').format(followUp.followUpDate!), style: TextStyle(fontSize: 11, color: Colors.grey[500])),
              ],
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () => _makeCall(followUp.phoneNumber),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: const Color(0xFF22C55E), borderRadius: BorderRadius.circular(8)),
                  child: const Text('Call', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    switch (status) {
      case 'completed': color = Colors.green; break;
      case 'missed': color = Colors.red; break;
      case 'no-answer': color = Colors.orange; break;
      case 'converted': color = Colors.teal; break;
      default: color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
      child: Text(status.replaceAll('-', ' '), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
    );
  }

  Widget _buildOutcomeChip(String outcome) {
    Color color;
    switch (outcome) {
      case 'interested': color = Colors.green; break;
      case 'not-interested': color = Colors.red; break;
      case 'follow-up': color = Colors.blue; break;
      case 'converted': color = Colors.teal; break;
      default: color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
      child: Text(outcome.replaceAll('-', ' '), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color)),
    );
  }
}
