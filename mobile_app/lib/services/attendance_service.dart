import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:call_log/call_log.dart';
import 'package:permission_handler/permission_handler.dart';
import '../config/api_config.dart';

class AttendanceService {
  final String token;

  AttendanceService(this.token);

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  };

  Future<void> checkIn() async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/attendance/check-in'),
      headers: _headers,
    );

    if (response.statusCode != 201 && response.statusCode != 400) {
      throw Exception('Failed to check in: ${response.body}');
    }
  }

  Future<void> checkOut() async {
    // Request permissions
    Map<Permission, PermissionStatus> statuses = await [
      Permission.phone,
      Permission.contacts,
    ].request();

    if (statuses[Permission.phone]!.isDenied || statuses[Permission.contacts]!.isDenied) {
      // If denied, we might still try, or throw. 
      // For now, let's try to proceed as some devices might behave differently.
      // But ideally we should warn.
      print('Permissions denied');
    }
    
    // Fetch check-in time to filter logs
    final statusResponse = await getStatus();
    DateTime checkInTime;
    if (statusResponse['status'] == 'CHECKED_IN') {
        checkInTime = DateTime.parse(statusResponse['data']['checkInTime']);
    } else {
        throw Exception('Not checked in');
    }

    Iterable<CallLogEntry> entries = await CallLog.query(
      dateFrom: checkInTime.millisecondsSinceEpoch,
      dateTo: DateTime.now().millisecondsSinceEpoch,
    );

    List<Map<String, dynamic>> logs = entries.map((e) => {
      'number': e.number,
      'name': e.name,
      'type': _getCallType(e.callType),
      'date': e.timestamp,
      'duration': e.duration,
      'simDisplayName': e.simDisplayName,
    }).toList();

    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/attendance/check-out'),
      headers: _headers,
      body: jsonEncode({'callLogs': logs}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to check out');
    }
  }

  String _getCallType(CallType? type) {
      if (type == CallType.incoming) return 'INCOMING';
      if (type == CallType.outgoing) return 'OUTGOING';
      if (type == CallType.missed) return 'MISSED';
      return 'UNKNOWN';
  }

  Future<Map<String, dynamic>> getStatus() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/attendance/status'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to get status');
  }
}
