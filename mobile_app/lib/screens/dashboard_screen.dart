import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../services/attendance_service.dart';
import '../models/models.dart';
import 'login_screen.dart';
import 'chat_screen.dart';
import 'call_log_screen.dart';
import 'dialer_screen.dart';

import 'package:permission_handler/permission_handler.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _currentIndex = 0;
  List<Lead> _leads = [];
  List<CallLog> _calls = [];
  List<CallLog> _followUps = [];
  WorkerStats? _stats;
  bool _isLoading = true;
  String? _error;
  String _attendanceStatus = 'CHECKED_OUT';

  bool _isAttendanceLoading = false;

  // Filter States
  String _leadsFilter = 'all'; // 'all' (Assigned) or 'pending'
  String _searchQuery = '';
  DateTimeRange? _selectedDateRange;
  final TextEditingController _searchController = TextEditingController();

  // Colors - White Theme
  static const Color kBgColor = Color(0xFFF8FAFC); // Slate-50
  static const Color kCardColor = Colors.white;
  static const Color kPrimaryColor = Color(0xFF2563EB); // Blue-600
  static const Color kSecondaryColor = Color(0xFF64748B); // Slate-500
  static const Color kTextColor = Color(0xFF1E293B); // Slate-800
  static const Color kSubTextColor = Color(0xFF94A3B8); // Slate-400

  @override
  void initState() {
    super.initState();
    _checkPermissions();
    _loadData();
  }

  Future<void> _checkPermissions() async {
    final permissions = [
      Permission.phone,
      Permission.contacts,
      // Permission.callLog (use phone state instead or check specific platform handling)
    ];

    bool allGranted = true;
    for (var permission in permissions) {
      if (!await permission.isGranted) {
        allGranted = false;
        break;
      }
    }

    if (!allGranted) {
      _requestPermissions(permissions);
    }
  }

  Future<void> _requestPermissions(List<Permission> permissions) async {
    Map<Permission, PermissionStatus> statuses = await permissions.request();

    bool permanentlyDenied = false;
    statuses.forEach((key, value) {
      if (value.isPermanentlyDenied) {
        permanentlyDenied = true;
      }
    });

    if (permanentlyDenied && mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('Permissions Required'),
          content: const Text(
            'This app requires Phone, Contacts, and Call Log permissions to function properly. '
            'Please enable them in the app settings.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                openAppSettings();
                Navigator.pop(context);
              },
              child: const Text('Open Settings'),
            ),
          ],
        ),
      );
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData({bool showLoading = true}) async {
    if (showLoading) {
      if (mounted) {
        setState(() {
          _isLoading = true;
          _error = null;
        });
      }
    }

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);
      final attendanceService = AttendanceService(authService.token!);

      final results = await Future.wait([
        apiService.getLeads(),
        apiService.getStats(),
        apiService.getCalls(),
        apiService.getFollowUps(),
        attendanceService.getStatus(),
      ]);

      if (mounted) {
        setState(() {
          _leads = results[0] as List<Lead>;
          _stats = results[1] as WorkerStats;
          _calls = results[2] as List<CallLog>;
          _followUps = results[3] as List<CallLog>;
          final statusData = results[4] as Map<String, dynamic>;
          _attendanceStatus = statusData['status'] ?? 'CHECKED_OUT';
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

  Future<void> _toggleAttendance() async {
    setState(() => _isAttendanceLoading = true);
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final attendanceService = AttendanceService(authService.token!);

      if (_attendanceStatus == 'CHECKED_OUT') {
        await attendanceService.checkIn();
        setState(() => _attendanceStatus = 'CHECKED_IN');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Checked in successfully')),
          );
        }
      } else {
        await attendanceService.checkOut();
        setState(() => _attendanceStatus = 'CHECKED_OUT');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Checked out successfully. Call logs synced.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isAttendanceLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: kBgColor,
        body: Center(child: CircularProgressIndicator(color: kPrimaryColor)),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: kBgColor,
        body: Center(
            child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Error loading data',
                style: TextStyle(color: Colors.red[300])),
            const SizedBox(height: 10),
            ElevatedButton(onPressed: _loadData, child: const Text('Retry'))
          ],
        )),
      );
    }

    return Scaffold(
      backgroundColor: kBgColor,
      body: SafeArea(
        child: IndexedStack(
          index: _currentIndex,
          children: [
            _buildHomeTab(),
            _buildLeadsTab(),
            _buildActivityTab(),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: Colors.white,
          selectedItemColor: kPrimaryColor,
          unselectedItemColor: kSecondaryColor,
          type: BottomNavigationBarType.fixed,
          showSelectedLabels: true,
          showUnselectedLabels: true,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
                icon: Icon(Icons.dashboard_rounded), label: 'Home'),
            BottomNavigationBarItem(
                icon: Icon(Icons.people_alt_rounded), label: 'Leads'),
            BottomNavigationBarItem(
                icon: Icon(Icons.history_rounded), label: 'Activity'),
          ],
        ),
      ),
      floatingActionButton: _currentIndex == 0 || _currentIndex == 1
          ? FloatingActionButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const DialerScreen()),
                );
              },
              backgroundColor: kPrimaryColor,
              child: const Icon(Icons.dialpad_rounded, color: Colors.white),
            )
          : null,
    );
  }

  // --- HOME TAB ---
  Widget _buildHomeTab() {
    final authService = Provider.of<AuthService>(context);
    final userName = authService.user?['name'] ?? 'Agent';

    return RefreshIndicator(
      onRefresh: _handleRefresh,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Welcome back,',
                      style: TextStyle(color: kSecondaryColor, fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      userName,
                      style: const TextStyle(
                        color: kTextColor,
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: _logout,
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.logout_rounded, color: Colors.red),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Attendance Card
            _buildAttendanceCard(),
            const SizedBox(height: 24),

            // Stats Section
            if (_stats != null) _buildNewStatsLayout(),

            const SizedBox(height: 24),

            // Today's Follow-ups Preview
            if (_followUps.isNotEmpty) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Follow-ups Due',
                    style: TextStyle(
                      color: kTextColor,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton(
                    onPressed: () => setState(() => _currentIndex = 2),
                    child: const Text('View All'),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _followUps.take(3).length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (context, index) =>
                    _buildCallLogItem(_followUps[index]),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildNewStatsLayout() {
    return Column(
      children: [
        // NEW: Progress by Call Type Card
        _buildProgressByCallTypeCard(),
        const SizedBox(height: 16),

        // NEW: Today's Calls Statistics Card
        _buildTodayCallsStatsCard(),
        const SizedBox(height: 16),

        // Row 1: Assigned vs Dialed (Progress) AND Orders
        Row(
          children: [
            Expanded(
              flex: 3,
              child: _buildAssignedVsDialedCard(),
            ),
            const SizedBox(width: 16),
            Expanded(
              flex: 2,
              child: _buildModernStatCard(
                'Orders',
                '${_stats!.orders}',
                Icons.shopping_bag_rounded,
                Colors.orange,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Row 2: Avg Call Duration (Single Box)
        _buildLargeStatCard(
          'Avg. Call Duration',
          '${_stats!.avgCallDuration}s',
          Icons.timer_rounded,
          const Color(0xFF8B5CF6),
        ),
        const SizedBox(height: 16),
        // Row 3: Others
        Row(
          children: [
            Expanded(
              child: _buildModernStatCard(
                'Today Calls',
                '${_stats!.todayCalls}',
                Icons.phone_in_talk_rounded,
                Colors.blue,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildModernStatCard(
                'Assigned / Pending',
                '${_stats!.totalLeads} / ${(_stats!.totalLeads - _stats!.dialedLeads)}',
                Icons.assignment_ind_rounded,
                Colors.redAccent,
                onTap: () => setState(() => _currentIndex = 1),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // NEW: Progress by Call Type Card
  Widget _buildProgressByCallTypeCard() {
    final progress = _stats!.progressByCallType;
    if (progress.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.trending_up_rounded,
                    color: Color(0xFF10B981), size: 22),
              ),
              const SizedBox(width: 12),
              const Text(
                'PROGRESS',
                style: TextStyle(
                  color: kTextColor,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Header Row
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
            decoration: BoxDecoration(
              color: kBgColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    'DIALED VS\nASSIGNED',
                    style: TextStyle(
                      color: kSecondaryColor,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                ...progress.map((p) => Expanded(
                      child: Text(
                        p.callType.toUpperCase(),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: kSecondaryColor,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    )),
              ],
            ),
          ),
          const SizedBox(height: 12),
          // Data Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    '${_stats!.dialedLeads}/${_stats!.totalLeads}',
                    style: const TextStyle(
                      color: kTextColor,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                ...progress.map((p) => Expanded(
                      child: Text(
                        '${p.dialed}/${p.assigned}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: kTextColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    )),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // NEW: Today's Calls Statistics Card
  Widget _buildTodayCallsStatsCard() {
    final todayStats = _stats!.todayCallStats;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF3B82F6).withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.phone_callback_rounded,
                    color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),
              const Text(
                'TOTAL CALLS TODAY',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Total Calls
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${todayStats.totalCalls}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Total Calls',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              // Duration Info
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      todayStats.totalDurationFormatted,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${todayStats.perCallDuration.toStringAsFixed(1)}s per call',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Answered Calls Row
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.call, color: Colors.white, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'ANSWERED CALLS',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                Text(
                  '${todayStats.answeredCalls}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAssignedVsDialedCard() {
    double progress =
        _stats!.totalLeads > 0 ? _stats!.dialedLeads / _stats!.totalLeads : 0;
    return Container(
      padding: const EdgeInsets.all(16),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.assignment_turned_in_rounded,
                    color: Colors.blue, size: 20),
              ),
              const SizedBox(width: 12),
              const Text(
                'Progress',
                style: TextStyle(
                    color: kSecondaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w500),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            '${_stats!.dialedLeads} / ${_stats!.totalLeads}',
            style: const TextStyle(
              color: kTextColor,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Dialed vs Assigned',
            style: TextStyle(color: kSubTextColor, fontSize: 12),
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.grey[100],
            valueColor: const AlwaysStoppedAnimation<Color>(Colors.blue),
            minHeight: 6,
            borderRadius: BorderRadius.circular(3),
          ),
        ],
      ),
    );
  }

  Widget _buildLargeStatCard(
      String title, String value, IconData icon, Color color) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
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
        border: Border.all(color: color.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 20),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(
                  color: kTextColor,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                title,
                style: const TextStyle(
                  color: kSecondaryColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceCard() {
    final isCheckedIn = _attendanceStatus == 'CHECKED_IN';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isCheckedIn
              ? [const Color(0xFF059669), const Color(0xFF10B981)]
              : [const Color(0xFFDC2626), const Color(0xFFEF4444)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: (isCheckedIn ? Colors.green : Colors.red).withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isCheckedIn ? Icons.timer_rounded : Icons.timer_off_rounded,
              color: Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isCheckedIn ? 'You are Online' : 'You are Offline',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isCheckedIn
                      ? 'Tracking duration...'
                      : 'Check in to start calls',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: _isAttendanceLoading ? null : _toggleAttendance,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: isCheckedIn ? Colors.green : Colors.red,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            ),
            child: _isAttendanceLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(isCheckedIn ? 'Check Out' : 'Check In'),
          ),
        ],
      ),
    );
  }

  Widget _buildModernStatCard(
      String title, String value, IconData icon, Color color,
      {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    color: kTextColor,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  title,
                  style: const TextStyle(
                    color: kSecondaryColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- LEADS TAB ---

  List<Lead> get _filteredLeads {
    return _leads.where((lead) {
      if (_leadsFilter == 'pending') {
        // Define 'pending' logic here. E.g., status is 'new', or 'follow-up'?, or simply not 'converted'/'not-interested'?
        // The user said "assinded vs pending".
        // Usually, Pending means not yet acted upon or future follow-up.
        // Let's assume 'Pending' means leads that are NOT in a final state (like converted, not-interested).
        // OR better: Leads that have not been dialed yet (status == 'new') for strict "Pending" meaning "To do".
        // User previously said "pending to be convert as assiged / pending".
        // And stats uses "totalLeads - dialedLeads" for pending.
        // So let's try to match that: Pending = Not Dialed.
        // However, we don't have 'dialed' flag directly on Lead, but we might infer from status or lastInteraction.
        // If lastInteraction is null, it's definitely pending/new.
        if (lead.lastInteraction != null) {
          return false; // It has been interacted with, so not "strictly" pending in "To Do" sense?
          // But what about follow-ups? They are also pending tasks.
          // If user wants "Assigned" list (All) vs "Pending" list.
          // Let's stick to: Pending = No interaction yet (Status 'new' or null).
        }
      }

      final matchesSearch =
          lead.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              lead.phone.contains(_searchQuery);

      bool matchesDate = true;
      if (_selectedDateRange != null) {
        // Use updatedAt or fallback to a default if null for filtering?
        // If updatedAt is null, we assume it matches or doesn't match based on requirement.
        // Here we'll treat null as "no date" and strictly filter if date is present.
        if (lead.updatedAt != null) {
          final start = _selectedDateRange!.start;
          final end = _selectedDateRange!.end
              .add(const Duration(days: 1)); // End of day
          matchesDate =
              lead.updatedAt!.isAfter(start) && lead.updatedAt!.isBefore(end);
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesDate;
    }).toList();
  }

  Future<void> _selectDateRange() async {
    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      initialDateRange: _selectedDateRange,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: kPrimaryColor,
              onPrimary: Colors.white,
              onSurface: kTextColor,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDateRange) {
      setState(() {
        _selectedDateRange = picked;
      });
    }
  }

  Widget _buildLeadsTab() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          color: kBgColor,
          child: Column(
            children: [
              Row(
                children: [
                  const Text(
                    'Leads',
                    style: TextStyle(
                      color: kTextColor,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const Spacer(),
                  if (_selectedDateRange != null)
                    Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: InputChip(
                        label: Text(
                          '${DateFormat('MMM d').format(_selectedDateRange!.start)} - ${DateFormat('MMM d').format(_selectedDateRange!.end)}',
                          style: const TextStyle(
                              fontSize: 12, color: Colors.white),
                        ),
                        backgroundColor: kPrimaryColor,
                        onDeleted: () {
                          setState(() {
                            _selectedDateRange = null;
                          });
                        },
                        deleteIcon: const Icon(Icons.close,
                            size: 14, color: Colors.white),
                      ),
                    ),
                  InkWell(
                    onTap: _selectDateRange,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.withOpacity(0.2)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Icon(Icons.calendar_today_rounded,
                          color: _selectedDateRange != null
                              ? kPrimaryColor
                              : kTextColor,
                          size: 20),
                    ),
                  )
                ],
              ),
              const SizedBox(height: 20),

              // Filter Tabs
              Container(
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    Expanded(child: _buildFilterTab('All Assigned', 'all')),
                    Expanded(child: _buildFilterTab('Pending', 'pending')),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Search Bar
              TextField(
                controller: _searchController,
                onChanged: (value) {
                  setState(() {
                    _searchQuery = value;
                  });
                },
                style: const TextStyle(color: kTextColor),
                decoration: InputDecoration(
                  hintText: 'Search leads by name or phone...',
                  hintStyle: const TextStyle(color: kSecondaryColor),
                  prefixIcon: const Icon(Icons.search, color: kSecondaryColor),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide:
                        const BorderSide(color: kPrimaryColor, width: 1.5),
                  ),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: kSecondaryColor),
                          onPressed: () {
                            _searchController.clear();
                            setState(() => _searchQuery = '');
                          },
                        )
                      : null,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _handleRefresh,
            child: _filteredLeads.isEmpty
                ? _buildEmptyState(_leads.isEmpty
                    ? 'No leads assigned'
                    : 'No matching leads found')
                : ListView.separated(
                    padding: const EdgeInsets.all(20),
                    itemCount: _filteredLeads.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) =>
                        _buildLeadItem(_filteredLeads[index]),
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildLeadItem(Lead lead) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kCardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: kPrimaryColor.withOpacity(0.1),
            child: Text(
              lead.name.characters.first.toUpperCase(),
              style: const TextStyle(
                  color: kPrimaryColor, fontWeight: FontWeight.bold),
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
                      color: kTextColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 16),
                ),
                const SizedBox(height: 4),
                Text(
                  lead.phone,
                  style: const TextStyle(color: kSecondaryColor, fontSize: 13),
                ),
                if (lead.status != null) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                        color: Colors.grey.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4)),
                    child: Text(
                      lead.status!.toUpperCase(),
                      style: const TextStyle(color: kTextColor, fontSize: 10),
                    ),
                  )
                ]
              ],
            ),
          ),
          Row(
            children: [
              IconButton(
                icon:
                    const Icon(Icons.chat_bubble_outline, color: kPrimaryColor),
                onPressed: () {
                  Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => ChatScreen(lead: lead)));
                },
              ),
              IconButton(
                icon: const Icon(Icons.phone, color: Color(0xFF10B981)),
                onPressed: () {
                  _makeCall(lead.phone);
                  Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => CallLogScreen(lead: lead)));
                },
              ),
            ],
          )
        ],
      ),
    );
  }

  // --- ACTIVITY TAB ---
  Widget _buildActivityTab() {
    // Filter calls to get orders
    final orders = _calls
        .where((c) =>
            c.orderStatus != null || c.outcome.toLowerCase() == 'converted')
        .toList();

    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius:
                  const BorderRadius.vertical(bottom: Radius.circular(30)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.03),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Activity',
                      style: TextStyle(
                        color: kTextColor,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: kBgColor,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.tune_rounded,
                          color: kTextColor, size: 20),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: kBgColor,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: TabBar(
                    indicator: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    labelColor: kPrimaryColor,
                    labelStyle: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14),
                    unselectedLabelColor: kSecondaryColor,
                    unselectedLabelStyle: const TextStyle(
                        fontWeight: FontWeight.normal, fontSize: 14),
                    tabs: const [
                      Tab(text: 'Calls'),
                      Tab(text: 'Follow-ups'),
                      Tab(text: 'Orders'),
                    ],
                    dividerColor: Colors.transparent,
                    indicatorSize: TabBarIndicatorSize.tab,
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                _buildListOrEmpty(_calls, 'No recent calls'),
                _buildListOrEmpty(_followUps, 'No pending follow-ups'),
                _buildListOrEmpty(orders, 'No orders found'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildListOrEmpty(List<CallLog> items, String emptyMsg) {
    if (items.isEmpty) return _buildEmptyState(emptyMsg);
    return RefreshIndicator(
      onRefresh: _handleRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) => _buildCallLogItem(items[index]),
      ),
    );
  }

  Widget _buildCallLogItem(CallLog log) {
    Color outcomeColor = _getOutcomeColor(log.outcome);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kCardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: outcomeColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(_getOutcomeIcon(log.outcome),
                color: outcomeColor, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  log.leadName ?? 'Unknown',
                  style: const TextStyle(
                      color: kTextColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 16),
                ),
                const SizedBox(height: 4),
                Text(
                  DateFormat('MMM d, h:mm a').format(log.createdAt),
                  style: const TextStyle(color: kSecondaryColor, fontSize: 12),
                ),
                if (log.notes != null && log.notes!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    log.notes!,
                    style: const TextStyle(
                        color: kSecondaryColor,
                        fontSize: 13,
                        fontStyle: FontStyle.italic),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  )
                ]
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${log.duration}s',
                style: const TextStyle(
                    color: kSecondaryColor, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 5),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                    border: Border.all(color: outcomeColor.withOpacity(0.5)),
                    borderRadius: BorderRadius.circular(4)),
                child: Text(
                  log.outcome.toUpperCase(),
                  style: TextStyle(
                      color: outcomeColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold),
                ),
              )
            ],
          )
        ],
      ),
    );
  }

  Widget _buildFilterTab(String label, String value) {
    final isSelected = _leadsFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _leadsFilter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  )
                ]
              : null,
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? kPrimaryColor : kSecondaryColor,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inbox, size: 64, color: Colors.grey[700]),
          const SizedBox(height: 16),
          Text(
            message,
            style: TextStyle(color: Colors.grey[500], fontSize: 16),
          ),
        ],
      ),
    );
  }

  Color _getOutcomeColor(String outcome) {
    switch (outcome.toLowerCase()) {
      case 'interested':
        return Colors.green;
      case 'not-interested':
        return Colors.red;
      case 'follow-up':
        return Colors.orange;
      case 'callback':
        return Colors.blue;
      case 'converted':
        return Colors.purple;
      default:
        return Colors.grey;
    }
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
        return Icons.phone_missed_rounded;
    }
  }
}
