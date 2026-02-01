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
      // User returned to app, maybe call ended?
      // We can't know for sure, but we can prompt them or just keep timer running
    }
  }

  Future<void> _loadHistory() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);
      final calls = await apiService.getCalls(limit: 5); // Get recent calls

      // Filter for this lead locally since API might not support filtering by leadId yet for history
      // Or if it does, update ApiService. For now, simple filter:
      final leadCalls =
          calls.where((c) => c.phoneNumber == widget.lead.phone).toList();

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
      print('Error loading history: $e');
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

    // Launch system dialer
    String number = widget.lead.phone.trim();
    // Fix: If number starts with 91 and is 12 digits, strip the 91 country code
    // as it can cause "wrong number" errors on some dialers without the + prefix
    if (number.startsWith('91') && number.length == 12) {
      number = number.substring(2);
    }

    await FlutterPhoneDirectCaller.callNumber(number);
  }

  void _endCall() {
    _timer?.cancel();
    setState(() => _isCallActive = false);

    // Show outcome sheet with auto-calculated duration
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
        onOutcomeSelected: (outcome,
            notes,
            duration,
            followUpDate,
            followUpNotes,
            priority,
            product,
            location,
            businessDetails,
            orderStatus) async {
          Navigator.pop(context); // Close sheet
          await _saveCallOutcome(
              outcome,
              notes,
              duration,
              followUpDate,
              followUpNotes,
              priority,
              product,
              location,
              businessDetails,
              orderStatus);
        },
      ),
    );
  }

  Future<void> _saveCallOutcome(
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
          SnackBar(
            content: Text('Call logged successfully'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context); // Go back to previous screen
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Error saving outcome: $e'),
              backgroundColor: Colors.red),
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
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Call Mode',
            style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.chat_bubble_outline, color: Color(0xFF22C55E)),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => ChatScreen(lead: widget.lead)),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          // Active Call UI
          Container(
            padding: const EdgeInsets.all(32),
            child: Column(
              children: [
                Hero(
                  tag: 'avatar_${widget.lead.id}',
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [Color(0xFF22C55E), Color(0xFF14B8A6)]),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF22C55E).withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        widget.lead.name[0].toUpperCase(),
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 40,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  widget.lead.name,
                  style: const TextStyle(
                      fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.lead.phone,
                  style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                ),
                const SizedBox(height: 32),
                if (_isCallActive) ...[
                  Text(
                    _formatDuration(_durationSeconds),
                    style: const TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.w300,
                        fontFeatures: [FontFeature.tabularFigures()]),
                  ),
                  const SizedBox(height: 8),
                  const Text('Call in progress...',
                      style: TextStyle(
                          color: Colors.green, fontWeight: FontWeight.w500)),
                ] else ...[
                  const Text(
                    'Ready to call',
                    style: TextStyle(fontSize: 18, color: Colors.grey),
                  ),
                ],
                const SizedBox(height: 40),
                if (!_isCallActive)
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: _startCall,
                      icon: const Icon(Icons.call),
                      label: const Text('START CALL'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF22C55E),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                        elevation: 4,
                      ),
                    ),
                  )
                else
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: _endCall,
                      icon: const Icon(Icons.call_end),
                      label: const Text('END CALL'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                        elevation: 4,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          const Divider(height: 1),

          // History Section
          Expanded(
            child: Container(
              color: Colors.grey[50],
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      'Previous Interactions',
                      style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey[700]),
                    ),
                  ),
                  Expanded(
                    child: _isLoadingHistory
                        ? const Center(child: CircularProgressIndicator())
                        : _history.isEmpty
                            ? Center(
                                child: Text('No history found',
                                    style: TextStyle(color: Colors.grey[500])))
                            : ListView.builder(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 16),
                                itemCount: _history.length,
                                itemBuilder: (context, index) {
                                  final call = _history[index];
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border:
                                          Border.all(color: Colors.grey[200]!),
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              DateFormat('MMM d, yyyy • h:mm a')
                                                  .format(call.createdAt),
                                              style: TextStyle(
                                                  fontSize: 12,
                                                  color: Colors.grey[500]),
                                            ),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 6,
                                                      vertical: 2),
                                              decoration: BoxDecoration(
                                                color: Colors.blue
                                                    .withOpacity(0.1),
                                                borderRadius:
                                                    BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                call.outcome.toUpperCase(),
                                                style: const TextStyle(
                                                    fontSize: 10,
                                                    color: Colors.blue,
                                                    fontWeight:
                                                        FontWeight.bold),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        if (call.notes != null &&
                                            call.notes!.isNotEmpty)
                                          Text(call.notes!,
                                              style: const TextStyle(
                                                  fontSize: 14)),
                                        if (call.product != null &&
                                            call.product!.isNotEmpty) ...[
                                          const SizedBox(height: 4),
                                          Row(
                                            children: [
                                              Icon(Icons.shopping_bag_outlined,
                                                  size: 12,
                                                  color: Colors.grey[600]),
                                              const SizedBox(width: 4),
                                              Text('Product: ${call.product}',
                                                  style: TextStyle(
                                                      fontSize: 12,
                                                      color: Colors.grey[600])),
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
