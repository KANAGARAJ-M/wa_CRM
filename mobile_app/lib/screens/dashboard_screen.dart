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
import 'assigned_orders_screen.dart';

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
  DateTime? _lastBackPressTime;

  // Colors - Skeuomorphic Theme (warm, tactile feel)
  static const Color kBgColor = Color(0xFFE8E0D5); // Warm beige/leather-like
  static const Color kCardColor = Color(0xFFF5F0E8); // Creamy white
  static const Color kPrimaryColor = Color(0xFF8B4513); // Saddle brown
  static const Color kAccentColor = Color(0xFFCD853F); // Peru/golden
  static const Color kSecondaryColor = Color(0xFF6B5344); // Warm brown
  static const Color kTextColor = Color(0xFF3D2914); // Dark brown
  static const Color kSubTextColor = Color(0xFF8B7355); // Light brown
  static const Color kHighlightColor =
      Color(0xFFFFFAF0); // Floral white (for emboss)
  static const Color kShadowColor = Color(0xFF5C4033); // Dark brown shadow

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

      if (authService.token == null) {
        throw Exception('Not authenticated. Please login again.');
      }

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

  String _formatDuration(num seconds) {
    int totalSeconds = seconds.round();
    int minutes = totalSeconds ~/ 60;
    int remainingSeconds = totalSeconds % 60;
    if (minutes > 0) {
      return '${minutes}m ${remainingSeconds}s';
    } else {
      return '${remainingSeconds}s';
    }
  }

  // Skeuomorphic Decoration - Embossed Card (raised effect)
  BoxDecoration _skeuoEmbossedDecoration(
      {Color? baseColor, double radius = 16}) {
    final color = baseColor ?? kCardColor;
    return BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: kHighlightColor.withOpacity(0.5), width: 1),
      boxShadow: [
        // Bottom-right shadow (depth)
        BoxShadow(
          color: kShadowColor.withOpacity(0.25),
          blurRadius: 8,
          offset: const Offset(4, 4),
        ),
        // Top-left highlight (emboss)
        BoxShadow(
          color: kHighlightColor.withOpacity(0.9),
          blurRadius: 8,
          offset: const Offset(-3, -3),
        ),
        // Subtle inner glow
        BoxShadow(
          color: color.withOpacity(0.8),
          blurRadius: 2,
          spreadRadius: -1,
          offset: const Offset(0, 0),
        ),
      ],
    );
  }

  // Skeuomorphic Decoration - Debossed/Inset (pressed effect)
  BoxDecoration _skeuoDebossedDecoration(
      {Color? baseColor, double radius = 12}) {
    final color = baseColor ?? kBgColor;
    return BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(color: kShadowColor.withOpacity(0.15), width: 1),
      boxShadow: [
        // Inner shadow effect simulated with dark border
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

  // Skeuomorphic Button Decoration
  BoxDecoration _skeuoButtonDecoration(Color color, {bool pressed = false}) {
    if (pressed) {
      return BoxDecoration(
        color: color.withOpacity(0.9),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.black.withOpacity(0.2), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 2,
            offset: const Offset(1, 1),
          ),
        ],
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

    return WillPopScope(
      onWillPop: () async {
        if (_currentIndex != 0) {
          setState(() => _currentIndex = 0);
          return false;
        }

        final now = DateTime.now();
        if (_lastBackPressTime == null ||
            now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
          _lastBackPressTime = now;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Press back again to exit'),
              duration: Duration(seconds: 2),
            ),
          );
          return false;
        }
        return true;
      },
      child: Scaffold(
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
          margin: const EdgeInsets.all(12),
          decoration:
              _skeuoEmbossedDecoration(baseColor: kCardColor, radius: 20),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: (index) => setState(() => _currentIndex = index),
              backgroundColor: Colors.transparent,
              selectedItemColor: kPrimaryColor,
              unselectedItemColor: kSubTextColor,
              type: BottomNavigationBarType.fixed,
              showSelectedLabels: true,
              showUnselectedLabels: true,
              elevation: 0,
              selectedLabelStyle:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
              unselectedLabelStyle: const TextStyle(fontSize: 10),
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
        ),
        floatingActionButton: _currentIndex == 0 || _currentIndex == 1
            ? Container(
                decoration: _skeuoButtonDecoration(kPrimaryColor),
                child: FloatingActionButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const DialerScreen()),
                    );
                  },
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  child: const Icon(Icons.dialpad_rounded,
                      color: Colors.white, size: 26),
                ),
              )
            : null,
      ),
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
                    Text(
                      'Welcome back,',
                      style: TextStyle(
                        color: kSubTextColor,
                        fontSize: 14,
                        fontStyle: FontStyle.italic,
                        shadows: [
                          Shadow(
                            color: kHighlightColor.withOpacity(0.8),
                            offset: const Offset(1, 1),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      userName,
                      style: TextStyle(
                        color: kTextColor,
                        fontSize: 26,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                        shadows: [
                          Shadow(
                            color: kHighlightColor.withOpacity(0.9),
                            offset: const Offset(1, 1),
                          ),
                          Shadow(
                            color: kShadowColor.withOpacity(0.2),
                            offset: const Offset(-0.5, -0.5),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: _logout,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: _skeuoEmbossedDecoration(radius: 14),
                    child: Icon(Icons.logout_rounded,
                        color: Colors.red[700], size: 22),
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
          _formatDuration(_stats!.avgCallDuration),
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
        const SizedBox(height: 16),
        // Row 4: Assigned Orders Button
        GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AssignedOrdersScreen()),
            );
          },
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  kAccentColor,
                  Color.lerp(kAccentColor, Colors.black, 0.3)!,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border:
                  Border.all(color: Colors.black.withOpacity(0.3), width: 1),
              boxShadow: [
                BoxShadow(
                  color: kShadowColor.withOpacity(0.5),
                  blurRadius: 10,
                  offset: const Offset(4, 6),
                ),
                BoxShadow(
                  color: kHighlightColor.withOpacity(0.2),
                  blurRadius: 2,
                  offset: const Offset(-1, -1),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.2)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 4,
                        offset: const Offset(2, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.shopping_bag_rounded,
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
                        'Assigned Orders',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          shadows: [
                            Shadow(
                              color: Colors.black.withOpacity(0.3),
                              offset: const Offset(1, 1),
                              blurRadius: 2,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'View and manage your assigned orders',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.8),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.arrow_forward_ios_rounded,
                    color: Colors.white.withOpacity(0.8),
                    size: 16,
                  ),
                ),
              ],
            ),
          ),
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
      padding: const EdgeInsets.all(18),
      decoration: _skeuoEmbossedDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: _skeuoDebossedDecoration(
                  baseColor: const Color(0xFF10B981).withOpacity(0.15),
                  radius: 10,
                ),
                child: const Icon(Icons.trending_up_rounded,
                    color: Color(0xFF10B981), size: 22),
              ),
              const SizedBox(width: 12),
              Text(
                'PROGRESS',
                style: TextStyle(
                  color: kTextColor,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                  shadows: [
                    Shadow(
                      color: kHighlightColor.withOpacity(0.8),
                      offset: const Offset(1, 1),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Header Row
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
            decoration: _skeuoDebossedDecoration(radius: 8),
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
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            kPrimaryColor,
            Color.lerp(kPrimaryColor, Colors.black, 0.25)!,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withOpacity(0.3), width: 1),
        boxShadow: [
          BoxShadow(
            color: kShadowColor.withOpacity(0.5),
            blurRadius: 10,
            offset: const Offset(4, 6),
          ),
          BoxShadow(
            color: kAccentColor.withOpacity(0.3),
            blurRadius: 2,
            offset: const Offset(-1, -1),
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
                      '${_formatDuration(todayStats.perCallDuration)} per call',
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
      decoration: _skeuoEmbossedDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: _skeuoDebossedDecoration(
                  baseColor: kAccentColor.withOpacity(0.15),
                  radius: 8,
                ),
                child: Icon(Icons.assignment_turned_in_rounded,
                    color: kPrimaryColor, size: 20),
              ),
              const SizedBox(width: 12),
              const Text(
                'Progress',
                style: TextStyle(
                    color: kSecondaryColor,
                    fontSize: 14,
                    fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            '${_stats!.dialedLeads} / ${_stats!.totalLeads}',
            style: TextStyle(
              color: kTextColor,
              fontSize: 22,
              fontWeight: FontWeight.bold,
              shadows: [
                Shadow(
                  color: kHighlightColor.withOpacity(0.9),
                  offset: const Offset(1, 1),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Dialed vs Assigned',
            style: TextStyle(color: kSubTextColor, fontSize: 12),
          ),
          const SizedBox(height: 12),
          Container(
            height: 8,
            decoration: _skeuoDebossedDecoration(radius: 4),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                backgroundColor: Colors.transparent,
                valueColor: AlwaysStoppedAnimation<Color>(kAccentColor),
                minHeight: 8,
              ),
            ),
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
      decoration: _skeuoEmbossedDecoration(),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: _skeuoDebossedDecoration(
              baseColor: color.withOpacity(0.12),
              radius: 12,
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
                  shadows: [
                    Shadow(
                      color: kHighlightColor.withOpacity(0.9),
                      offset: const Offset(1, 1),
                    ),
                  ],
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
    final statusColor =
        isCheckedIn ? const Color(0xFF2E7D32) : const Color(0xFFC62828);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      decoration: _skeuoEmbossedDecoration(radius: 14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  statusColor.withOpacity(0.3),
                  statusColor.withOpacity(0.1),
                ],
              ),
              border: Border.all(color: statusColor.withOpacity(0.4), width: 2),
              boxShadow: [
                BoxShadow(
                  color: statusColor.withOpacity(0.3),
                  blurRadius: 6,
                  spreadRadius: 1,
                ),
              ],
            ),
            child: Icon(
              isCheckedIn ? Icons.power_settings_new : Icons.power_off,
              color: statusColor,
              size: 18,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isCheckedIn ? 'Status: Online' : 'Status: Offline',
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    shadows: [
                      Shadow(
                        color: kHighlightColor.withOpacity(0.8),
                        offset: const Offset(1, 1),
                      ),
                    ],
                  ),
                ),
                Text(
                  isCheckedIn ? 'Tracking active' : 'Check in to start',
                  style: TextStyle(
                    color: kSubTextColor,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          Container(
            decoration: _skeuoButtonDecoration(statusColor),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _isAttendanceLoading ? null : _toggleAttendance,
                borderRadius: BorderRadius.circular(10),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: _isAttendanceLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text(
                          isCheckedIn ? 'Check Out' : 'Check In',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
            ),
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
        decoration: _skeuoEmbossedDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: _skeuoDebossedDecoration(
                baseColor: color.withOpacity(0.12),
                radius: 10,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    color: kTextColor,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    shadows: [
                      Shadow(
                        color: kHighlightColor.withOpacity(0.9),
                        offset: const Offset(1, 1),
                      ),
                    ],
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

              // Filter Tabs - Skeuomorphic Toggle Look
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: _skeuoDebossedDecoration(
                    baseColor: kBgColor.withOpacity(0.5), radius: 14),
                padding: const EdgeInsets.all(4),
                child: Row(
                  children: [
                    Expanded(child: _buildFilterTab('All Assigned', 'all')),
                    Expanded(child: _buildFilterTab('Pending', 'pending')),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Search Bar - Debossed look
              Container(
                decoration: _skeuoDebossedDecoration(radius: 16),
                child: TextField(
                  controller: _searchController,
                  onChanged: (value) => setState(() => _searchQuery = value),
                  style: const TextStyle(color: kTextColor, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'Search leads by name or phone...',
                    hintStyle: TextStyle(color: kSubTextColor.withOpacity(0.7)),
                    prefixIcon: const Icon(Icons.search_rounded,
                        color: kSecondaryColor),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 16),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded,
                                color: kSecondaryColor),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                  ),
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
      margin: const EdgeInsets.only(bottom: 2),
      padding: const EdgeInsets.all(16),
      decoration: _skeuoEmbossedDecoration(radius: 20),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: _skeuoDebossedDecoration(
              baseColor: kAccentColor.withOpacity(0.1),
              radius: 24,
            ),
            child: Center(
              child: Text(
                lead.name.characters.first.toUpperCase(),
                style: const TextStyle(
                    color: kPrimaryColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 18),
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
                      color: kTextColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 16),
                ),
                const SizedBox(height: 4),
                Text(
                  lead.phone,
                  style: const TextStyle(color: kSubTextColor, fontSize: 13),
                ),
                if (lead.status != null) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: _skeuoDebossedDecoration(
                      baseColor: kSubTextColor.withOpacity(0.05),
                      radius: 6,
                    ),
                    child: Text(
                      lead.status!.toUpperCase(),
                      style: TextStyle(
                          color: kSecondaryColor,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5),
                    ),
                  )
                ]
              ],
            ),
          ),
          Row(
            children: [
              Container(
                margin: const EdgeInsets.only(right: 8),
                decoration: _skeuoEmbossedDecoration(radius: 12),
                child: IconButton(
                  icon: const Icon(Icons.chat_bubble_outline_rounded,
                      color: kAccentColor, size: 20),
                  onPressed: () {
                    Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => ChatScreen(lead: lead)));
                  },
                ),
              ),
              Container(
                decoration: _skeuoEmbossedDecoration(radius: 12),
                child: IconButton(
                  icon: const Icon(Icons.phone_in_talk_rounded,
                      color: Color(0xFF2E7D32), size: 20),
                  onPressed: () {
                    _makeCall(lead.phone);
                    Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => CallLogScreen(lead: lead)));
                  },
                ),
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
      decoration: _skeuoEmbossedDecoration(radius: 20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: _skeuoDebossedDecoration(
              baseColor: outcomeColor.withOpacity(0.1),
              radius: 12,
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
                      fontWeight: FontWeight.bold,
                      fontSize: 16),
                ),
                const SizedBox(height: 4),
                Text(
                  DateFormat('MMM d, h:mm a').format(log.createdAt),
                  style: const TextStyle(color: kSubTextColor, fontSize: 12),
                ),
                if (log.notes != null && log.notes!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    log.notes!,
                    style: const TextStyle(
                        color: kSubTextColor,
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
                    color: kTextColor, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: _skeuoDebossedDecoration(
                  baseColor: outcomeColor.withOpacity(0.08),
                  radius: 6,
                ),
                child: Text(
                  log.outcome.toUpperCase(),
                  style: TextStyle(
                      color: outcomeColor,
                      fontSize: 9,
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
        decoration: isSelected
            ? _skeuoEmbossedDecoration(baseColor: Colors.white, radius: 10)
            : null,
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? kPrimaryColor : kSubTextColor,
              fontWeight: FontWeight.bold,
              fontSize: 13,
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
