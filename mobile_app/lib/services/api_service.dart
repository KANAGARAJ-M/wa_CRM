import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/models.dart';

class ApiService {
  final String token;

  ApiService(this.token);

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer $token',
  };

  Future<List<Lead>> getLeads() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/worker/leads'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List<dynamic> leadsJson = data['data'] ?? [];
      return leadsJson.map((json) => Lead.fromJson(json)).toList();
    }
    throw Exception('Failed to load leads');
  }

  Future<WorkerStats> getStats() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/worker/stats'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return WorkerStats.fromJson(data['data'] ?? {});
    }
    throw Exception('Failed to load stats');
  }

  Future<List<CallLog>> getCalls({int limit = 20, String? leadId}) async {
    String url = '${ApiConfig.baseUrl}/worker/calls?limit=$limit';
    if (leadId != null) {
      url += '&leadId=$leadId';
    }
    final response = await http.get(
      Uri.parse(url),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List<dynamic> callsJson = data['data'] ?? [];
      return callsJson.map((json) => CallLog.fromJson(json)).toList();
    }
    throw Exception('Failed to load calls');
  }

  Future<List<CallLog>> getFollowUps() async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/worker/follow-ups'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List<dynamic> followUpsJson = data['data'] ?? [];
      return followUpsJson.map((json) => CallLog.fromJson(json)).toList();
    }
    throw Exception('Failed to load follow-ups');
  }

  Future<List<Message>> getMessages(String phone) async {
    final response = await http.get(
      Uri.parse('${ApiConfig.baseUrl}/worker/messages/$phone'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final List<dynamic> messagesJson = data['data'] ?? [];
      return messagesJson.map((json) => Message.fromJson(json)).toList();
    }
    throw Exception('Failed to load messages');
  }

  Future<void> sendMessage(String phone, String message) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/whatsapp/send'),
      headers: _headers,
      body: jsonEncode({'phone': phone, 'message': message}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to send message');
    }
  }

  Future<void> logCall({
    required String leadId,
    required String phoneNumber,
    required String leadName,
    required String status,
    required String outcome,
    required int duration,
    String? notes,
    String? followUpDate,
    String? followUpNotes,
    String? priority,
    String? product,
    String? location,
    String? businessDetails,
    String? orderStatus,
  }) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/worker/calls'),
      headers: _headers,
      body: jsonEncode({
        'leadId': leadId,
        'phoneNumber': phoneNumber,
        'leadName': leadName,
        'status': status,
        'outcome': outcome,
        'duration': duration,
        'notes': notes,
        'followUpDate': followUpDate,
        'followUpNotes': followUpNotes,
        'priority': priority ?? 'medium',
        'product': product,
        'location': location,
        'businessName': businessDetails, // Mapping businessDetails arg to businessName field
        'orderStatus': orderStatus,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to log call');
    }
  }
}
