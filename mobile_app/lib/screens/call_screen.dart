import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_phone_direct_caller/flutter_phone_direct_caller.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import 'dialer_screen.dart'; // For CallOutcomeSheet
import 'chat_screen.dart';

// Skeuomorphic Theme Colors
const Color kBgColor = Color(0xFFE8E0D5);
const Color kCardColor = Color(0xFFF5F0E8);
const Color kPrimaryColor = Color(0xFF8B4513);
const Color kAccentColor = Color(0xFFCD853F);
const Color kSecondaryColor = Color(0xFF6B4423);
const Color kTextColor = Color(0xFF3E2723);
const Color kSubTextColor = Color(0xFF795548);
const Color kHighlightColor = Color(0xFFFFFBF5);
const Color kShadowColor = Color(0xFF5D4037);

class CallScreen extends StatefulWidget {
  final Lead lead;

  const CallScreen({super.key, required this.lead});

  @override
  State<CallScreen> createState() => _CallScreenState();
}

class _CallScreenState extends State<CallScreen> with WidgetsBindingObserver {
  Timer? _timer;
  int _durationSeconds = 0;
  bool _isCallActive = false;
  DateTime? _callStartTime;
  List<CallLog> _history = [];
  bool _isLoadingHistory = true;

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
    WidgetsBinding.instance.addObserver(this);
    _loadHistory();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _isCallActive) {
      // User returned
    }
  }

  Future<void> _loadHistory() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);
      final calls = await apiService.getCalls(limit: 5); 
      final leadCalls = calls.where((c) => c.phoneNumber == widget.lead.phone).toList();

      if (mounted) {
        setState(() {
          _history = leadCalls;
          _isLoadingHistory = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingHistory = false);
      }
    }
  }

  void _startCall() async {
    setState(() {
      _isCallActive = true;
      _callStartTime = DateTime.now();
      _durationSeconds = 0;
    });

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _durationSeconds++;
      });
    });

    String number = widget.lead.phone.trim();
    if (number.startsWith('91') && number.length == 12) {
      number = number.substring(2);
    }
    await FlutterPhoneDirectCaller.callNumber(number);
  }

  void _endCall() {
    _timer?.cancel();
    setState(() => _isCallActive = false);
    _showOutcomeSheet();
  }

  void _showOutcomeSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CallOutcomeSheet(
        lead: widget.lead,
        initialDuration: _durationSeconds,
        onOutcomeSelected: (outcome, notes, duration, followUpDate, followUpNotes, priority, product, location, businessDetails, orderStatus) async {
          Navigator.pop(context);
          await _saveCallOutcome(outcome, notes, duration, followUpDate, followUpNotes, priority, product, location, businessDetails, orderStatus);
        },
      ),
    );
  }

  Future<void> _saveCallOutcome(String outcome, String? notes, int duration, String? followUpDate, String? followUpNotes, String priority, String? product, String? location, String? businessDetails, String? orderStatus) async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);

      await apiService.logCall(
        leadId: widget.lead.id,
        phoneNumber: widget.lead.phone,
        leadName: widget.lead.name,
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

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Call logged successfully'), backgroundColor: Colors.green),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving outcome: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
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
        title: Text(
          'Call Mode',
          style: TextStyle(
            color: kTextColor,
            fontWeight: FontWeight.bold,
            shadows: [
              Shadow(
                color: kHighlightColor.withOpacity(0.9),
                offset: const Offset(1, 1),
              ),
            ],
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.all(8),
            decoration: _skeuoEmbossedDecoration(radius: 10),
            child: IconButton(
              icon: const Icon(Icons.chat_bubble_outline_rounded, color: kAccentColor, size: 20),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => ChatScreen(lead: widget.lead)),
                );
              },
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Active Call UI - Embossed Container
          Container(
            margin: const EdgeInsets.all(20),
            padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
            decoration: _skeuoEmbossedDecoration(radius: 24),
            child: Column(
              children: [
                Hero(
                  tag: 'avatar_${widget.lead.id}',
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: _skeuoDebossedDecoration(
                      baseColor: kAccentColor.withOpacity(0.1),
                      radius: 60,
                    ),
                    child: Center(
                      child: Text(
                        widget.lead.name[0].toUpperCase(),
                        style: TextStyle(
                          color: kPrimaryColor,
                          fontSize: 48,
                          fontWeight: FontWeight.bold,
                          shadows: [
                            Shadow(
                              color: kHighlightColor.withOpacity(0.8),
                              offset: const Offset(2, 2),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  widget.lead.name,
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: kTextColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.lead.phone,
                  style: TextStyle(fontSize: 16, color: kSubTextColor),
                ),
                const SizedBox(height: 32),
                if (_isCallActive) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                    decoration: _skeuoDebossedDecoration(radius: 16),
                    child: Text(
                      _formatDuration(_durationSeconds),
                      style: TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.w300,
                        color: kTextColor,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text('CALL IN PROGRESS...',
                      style: TextStyle(
                          color: Colors.green, fontWeight: FontWeight.bold, letterSpacing: 1, fontSize: 12)),
                ] else ...[
                  Text(
                    'READY TO CONNECT',
                    style: TextStyle(fontSize: 14, color: kSubTextColor, fontWeight: FontWeight.bold, letterSpacing: 1),
                  ),
                ],
                const SizedBox(height: 40),
                if (!_isCallActive)
                  SizedBox(
                    width: double.infinity,
                    height: 60,
                    child: GestureDetector(
                      onTap: _startCall,
                      child: Container(
                        decoration: _skeuoButtonDecoration(const Color(0xFF2E7D32)),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.call_rounded, color: Colors.white),
                            SizedBox(width: 12),
                            Text(
                              'START CALL',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                else
                  SizedBox(
                    width: double.infinity,
                    height: 60,
                    child: GestureDetector(
                      onTap: _endCall,
                      child: Container(
                        decoration: _skeuoButtonDecoration(const Color(0xFFC62828)),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.call_end_rounded, color: Colors.white),
                            SizedBox(width: 12),
                            Text(
                              'END CALL',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 1),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // History Section
          Expanded(
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.only(top: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    child: Text(
                      'PREVIOUS INTERACTIONS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: kSecondaryColor,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  Expanded(
                    child: _isLoadingHistory
                        ? const Center(child: CircularProgressIndicator(color: kPrimaryColor))
                        : _history.isEmpty
                            ? Center(
                                child: Text('No history found',
                                    style: TextStyle(color: kSubTextColor, fontStyle: FontStyle.italic)))
                            : ListView.builder(
                                padding: const EdgeInsets.symmetric(horizontal: 20),
                                itemCount: _history.length,
                                itemBuilder: (context, index) {
                                  final call = _history[index];
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 16),
                                    padding: const EdgeInsets.all(16),
                                    decoration: _skeuoEmbossedDecoration(radius: 16),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              DateFormat('MMM d, yyyy • h:mm a').format(call.createdAt),
                                              style: TextStyle(fontSize: 12, color: kSubTextColor),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                              decoration: _skeuoDebossedDecoration(
                                                baseColor: kAccentColor.withOpacity(0.1),
                                                radius: 6,
                                              ),
                                              child: Text(
                                                call.outcome.toUpperCase(),
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  color: kPrimaryColor,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        if (call.notes != null && call.notes!.isNotEmpty)
                                          Text(
                                            call.notes!,
                                            style: TextStyle(fontSize: 14, color: kTextColor),
                                          ),
                                        if (call.product != null && call.product!.isNotEmpty) ...[
                                          const SizedBox(height: 8),
                                          Row(
                                            children: [
                                              Icon(Icons.shopping_bag_outlined, size: 14, color: kSubTextColor),
                                              const SizedBox(width: 6),
                                              Text(
                                                'Product: ${call.product}',
                                                style: TextStyle(fontSize: 12, color: kSubTextColor),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ],
                                    ),
                                  );
                                },
                              ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
