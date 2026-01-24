import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';
import '../models/models.dart';

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
  DateTime? _followUpDate;
  bool _isSaving = false;

  final List<String> _statuses = ['completed', 'missed', 'no-answer', 'busy', 'callback-requested', 'not-interested', 'converted'];
  final List<String> _outcomes = ['other', 'interested', 'not-interested', 'follow-up', 'callback', 'converted', 'wrong-number', 'not-reachable'];
  final List<String> _priorities = ['low', 'medium', 'high', 'urgent'];

  @override
  void dispose() {
    _durationController.dispose();
    _notesController.dispose();
    _followUpNotesController.dispose();
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
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1F2937),
        elevation: 0,
        title: const Text('Log Call', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _saveCall,
            child: _isSaving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Save', style: TextStyle(color: Color(0xFF22C55E), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Lead Info
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: [
                  Container(
                    width: 48, height: 48,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF6366F1)]),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Center(child: Text(widget.lead.name[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18))),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.lead.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                      Text(widget.lead.phone, style: TextStyle(fontSize: 14, color: Colors.grey[600])),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Call Status
            _buildSectionTitle('Call Status'),
            _buildDropdown(_status, _statuses, (val) => setState(() => _status = val!)),
            const SizedBox(height: 16),

            // Outcome
            _buildSectionTitle('Outcome'),
            _buildDropdown(_outcome, _outcomes, (val) => setState(() => _outcome = val!)),
            const SizedBox(height: 16),

            // Duration
            _buildSectionTitle('Duration (seconds)'),
            _buildTextField(_durationController, 'Enter duration', TextInputType.number),
            const SizedBox(height: 16),

            // Notes
            _buildSectionTitle('Notes'),
            _buildTextField(_notesController, 'Add call notes...', TextInputType.multiline, maxLines: 3),
            const SizedBox(height: 16),

            // Follow-up Date
            _buildSectionTitle('Follow-up Date (Optional)'),
            GestureDetector(
              onTap: _selectFollowUpDate,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.calendar_today, color: Colors.grey[600]),
                    const SizedBox(width: 12),
                    Text(
                      _followUpDate != null
                          ? '${_followUpDate!.day}/${_followUpDate!.month}/${_followUpDate!.year} ${_followUpDate!.hour}:${_followUpDate!.minute.toString().padLeft(2, '0')}'
                          : 'Select date & time',
                      style: TextStyle(color: _followUpDate != null ? const Color(0xFF1F2937) : Colors.grey[500]),
                    ),
                    const Spacer(),
                    if (_followUpDate != null)
                      GestureDetector(
                        onTap: () => setState(() => _followUpDate = null),
                        child: Icon(Icons.close, color: Colors.grey[400], size: 20),
                      ),
                  ],
                ),
              ),
            ),

            if (_followUpDate != null) ...[
              const SizedBox(height: 16),
              _buildSectionTitle('Follow-up Notes'),
              _buildTextField(_followUpNotesController, 'What to discuss in follow-up...', TextInputType.multiline, maxLines: 2),
            ],

            const SizedBox(height: 16),

            // Priority
            _buildSectionTitle('Priority'),
            _buildDropdown(_priority, _priorities, (val) => setState(() => _priority = val!)),
            const SizedBox(height: 24),

            // Save Button
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _isSaving ? null : _saveCall,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF22C55E),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isSaving
                    ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                    : const Text('Save Call Log', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF374151))),
    );
  }

  Widget _buildDropdown(String value, List<String> items, ValueChanged<String?> onChanged) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isExpanded: true,
          items: items.map((item) => DropdownMenuItem(value: item, child: Text(_formatLabel(item)))).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint, TextInputType type, {int maxLines = 1}) {
    return TextField(
      controller: controller,
      keyboardType: type,
      maxLines: maxLines,
      decoration: InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[300]!)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey[300]!)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF22C55E), width: 2)),
      ),
    );
  }

  String _formatLabel(String value) {
    return value.split('-').map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
  }
}
