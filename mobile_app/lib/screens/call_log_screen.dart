import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/models.dart';

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

class CallLogScreen extends StatefulWidget {
  final Lead lead;

  const CallLogScreen({super.key, required this.lead});

  @override
  State<CallLogScreen> createState() => _CallLogScreenState();
}

class _CallLogScreenState extends State<CallLogScreen> {
  String _status = 'completed';
  String _outcome = 'other';
  String _priority = 'medium';
  final _durationController = TextEditingController(text: '0');
  final _notesController = TextEditingController();
  final _followUpNotesController = TextEditingController();
  final _locationController = TextEditingController();
  final _businessDetailsController = TextEditingController();
  String _orderStatus = 'not-ordered';
  DateTime? _followUpDate;
  bool _isSaving = false;

  final List<String> _statuses = ['completed', 'missed', 'no-answer', 'busy', 'callback-requested', 'not-interested', 'converted'];
  final List<String> _outcomes = ['other', 'interested', 'not-interested', 'follow-up', 'callback', 'converted', 'wrong-number', 'not-reachable'];
  final List<String> _priorities = ['low', 'medium', 'high', 'urgent'];
  final List<String> _orderStatuses = ['not-ordered', 'ordered', 'already-ordered'];

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
  void dispose() {
    _durationController.dispose();
    _notesController.dispose();
    _followUpNotesController.dispose();
    _locationController.dispose();
    _businessDetailsController.dispose();
    super.dispose();
  }

  Future<void> _saveCall() async {
    setState(() => _isSaving = true);
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);

      await apiService.logCall(
        leadId: widget.lead.id,
        phoneNumber: widget.lead.phone,
        leadName: widget.lead.name,
        status: _status,
        outcome: _outcome,
        duration: int.tryParse(_durationController.text) ?? 0,
        notes: _notesController.text.isNotEmpty ? _notesController.text : null,
        followUpDate: _followUpDate?.toIso8601String(),
        followUpNotes: _followUpNotesController.text.isNotEmpty ? _followUpNotesController.text : null,
        priority: _priority,
        location: _locationController.text.isNotEmpty ? _locationController.text : null,
        businessDetails: _businessDetailsController.text.isNotEmpty ? _businessDetailsController.text : null,
        orderStatus: _orderStatus,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Call logged successfully!'), backgroundColor: Colors.green),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  Future<void> _selectFollowUpDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (date != null && mounted) {
      final time = await showTimePicker(
        context: context,
        initialTime: const TimeOfDay(hour: 10, minute: 0),
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
          'Log Call',
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
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Lead Info - Embossed Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: _skeuoEmbossedDecoration(radius: 18),
              child: Row(
                children: [
                  Container(
                    width: 52, height: 52,
                    decoration: _skeuoDebossedDecoration(
                      baseColor: kAccentColor.withOpacity(0.15),
                      radius: 26,
                    ),
                    child: Center(
                      child: Text(
                        widget.lead.name[0].toUpperCase(),
                        style: TextStyle(
                          color: kPrimaryColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 22,
                          shadows: [
                            Shadow(
                              color: kHighlightColor.withOpacity(0.8),
                              offset: const Offset(1, 1),
                            ),
                          ],
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
                          widget.lead.name,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: kTextColor,
                          ),
                        ),
                        Text(
                          widget.lead.phone,
                          style: TextStyle(fontSize: 14, color: kSubTextColor),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            _buildSectionTitle('Call Status'),
            _buildDropdown(_status, _statuses, (val) => setState(() => _status = val!)),
            const SizedBox(height: 18),

            _buildSectionTitle('Outcome'),
            _buildDropdown(_outcome, _outcomes, (val) => setState(() => _outcome = val!)),
            const SizedBox(height: 18),

            _buildSectionTitle('Duration (seconds)'),
            _buildTextField(_durationController, 'Enter duration', TextInputType.number),
            const SizedBox(height: 18),

            _buildSectionTitle('Notes'),
            _buildTextField(_notesController, 'Add call notes...', TextInputType.multiline, maxLines: 3),
            const SizedBox(height: 18),

            _buildSectionTitle('Follow-up Date (Optional)'),
            GestureDetector(
              onTap: _selectFollowUpDate,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: _skeuoDebossedDecoration(radius: 12),
                child: Row(
                  children: [
                    Icon(Icons.calendar_today_rounded, color: kPrimaryColor, size: 20),
                    const SizedBox(width: 12),
                    Text(
                      _followUpDate != null
                          ? '${_followUpDate!.day}/${_followUpDate!.month}/${_followUpDate!.year} ${_followUpDate!.hour}:${_followUpDate!.minute.toString().padLeft(2, '0')}'
                          : 'Select date & time',
                      style: TextStyle(
                        color: _followUpDate != null ? kTextColor : kSubTextColor,
                        fontWeight: _followUpDate != null ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                    const Spacer(),
                    if (_followUpDate != null)
                      GestureDetector(
                        onTap: () => setState(() => _followUpDate = null),
                        child: Icon(Icons.close_rounded, color: kShadowColor, size: 20),
                      ),
                  ],
                ),
              ),
            ),

            if (_followUpDate != null) ...[
              const SizedBox(height: 18),
              _buildSectionTitle('Follow-up Notes'),
              _buildTextField(_followUpNotesController, 'What to discuss in follow-up...', TextInputType.multiline, maxLines: 2),
            ],

            const SizedBox(height: 18),
            _buildSectionTitle('Priority'),
            _buildDropdown(_priority, _priorities, (val) => setState(() => _priority = val!)),
            const SizedBox(height: 18),

            _buildSectionTitle('Location'),
            _buildTextField(_locationController, 'Enter location', TextInputType.text),
            const SizedBox(height: 18),

            _buildSectionTitle('Business Details'),
            _buildTextField(_businessDetailsController, 'Enter business details', TextInputType.text),
            const SizedBox(height: 18),

            _buildSectionTitle('Order Status'),
            _buildDropdown(_orderStatus, _orderStatuses, (val) => setState(() => _orderStatus = val!)),
            const SizedBox(height: 32),

            // Save Button - Metallic
            SizedBox(
              width: double.infinity,
              height: 56,
              child: GestureDetector(
                onTap: _isSaving ? null : _saveCall,
                child: Container(
                  decoration: _skeuoButtonDecoration(const Color(0xFF2E7D32)),
                  child: Center(
                    child: _isSaving
                        ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                        : const Text(
                            'Save Call Log',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1,
                            ),
                          ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(
        title.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: kSecondaryColor,
          letterSpacing: 1,
        ),
      ),
    );
  }

  Widget _buildDropdown(String value, List<String> items, ValueChanged<String?> onChanged) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: _skeuoDebossedDecoration(radius: 12),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: items.contains(value) ? value : items.first,
          isExpanded: true,
          icon: Icon(Icons.arrow_drop_down_rounded, color: kPrimaryColor),
          style: TextStyle(color: kTextColor, fontWeight: FontWeight.bold, fontSize: 14),
          dropdownColor: kCardColor,
          borderRadius: BorderRadius.circular(12),
          items: items.map((item) => DropdownMenuItem(value: item, child: Text(_formatLabel(item)))).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint, TextInputType type, {int maxLines = 1}) {
    return Container(
      decoration: _skeuoDebossedDecoration(radius: 12),
      child: TextField(
        controller: controller,
        keyboardType: type,
        maxLines: maxLines,
        style: TextStyle(color: kTextColor, fontWeight: FontWeight.bold, fontSize: 14),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: TextStyle(color: kSubTextColor, fontWeight: FontWeight.normal),
          contentPadding: const EdgeInsets.all(16),
          border: InputBorder.none,
        ),
      ),
    );
  }

  String _formatLabel(String value) {
    return value.split('-').map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
  }
}
