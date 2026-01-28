class Lead {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String? stage;
  final String? status;
  final String? notes;
  final String? phoneNumberId;
  final DateTime? updatedAt;
  final DateTime? lastInteraction;
  final String? source;
  final String? location;
  final String? businessName;
  final String? locationFilledBy;
  final String? businessFilledBy;

  Lead({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    this.stage,
    this.status,
    this.notes,
    this.phoneNumberId,
    this.updatedAt,
    this.lastInteraction,
    this.source,
    this.location,
    this.businessName,
    this.locationFilledBy,
    this.businessFilledBy,
  });

  factory Lead.fromJson(Map<String, dynamic> json) {
    return Lead(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      phone: json['phone'] ?? '',
      email: json['email'],
      stage: json['stage'],
      status: json['status'],
      notes: json['notes'],
      phoneNumberId: json['phoneNumberId'],
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : null,
      lastInteraction: json['lastInteraction'] != null ? DateTime.parse(json['lastInteraction']) : null,
      source: json['source'] ?? 'manual',
      location: json['location'],
      businessName: json['businessName'],
      locationFilledBy: json['locationFilledBy'] is Map ? json['locationFilledBy']['name'] : null,
      businessFilledBy: json['businessFilledBy'] is Map ? json['businessFilledBy']['name'] : null,
    );
  }
}

class Message {
  final String id;
  final String body;
  final bool isIncoming;
  final DateTime timestamp;
  final String? status;
  final String? type;

  Message({
    required this.id,
    required this.body,
    required this.isIncoming,
    required this.timestamp,
    this.status,
    this.type,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['_id'] ?? '',
      body: json['body'] ?? '',
      isIncoming: json['isIncoming'] ?? (json['direction'] == 'incoming'),
      timestamp: json['timestamp'] != null ? DateTime.parse(json['timestamp']) : DateTime.now(),
      status: json['status'],
      type: json['type'],
    );
  }
}

class CallLog {
  final String id;
  final String? leadId;
  final String? leadName;
  final String phoneNumber;
  final String status;
  final String outcome;
  final int duration;
  final String? notes;
  final DateTime? followUpDate;
  final String? followUpNotes;
  final String? priority;
  final String? product;
  final String? location;
  final String? businessDetails;
  final String? orderStatus;
  final String? workerName;
  final DateTime createdAt;

  CallLog({
    required this.id,
    this.leadId,
    this.leadName,
    required this.phoneNumber,
    required this.status,
    required this.outcome,
    required this.duration,
    this.notes,
    this.followUpDate,
    this.followUpNotes,
    this.priority,
    this.product,
    this.location,
    this.businessDetails,
    this.orderStatus,
    this.workerName,
    required this.createdAt,
  });

  factory CallLog.fromJson(Map<String, dynamic> json) {
    return CallLog(
      id: json['_id'] ?? '',
      leadId: json['leadId'] is Map ? json['leadId']['_id'] : json['leadId'],
      leadName: json['leadId'] is Map ? json['leadId']['name'] : json['leadName'],
      phoneNumber: json['phoneNumber'] ?? '',
      status: json['status'] ?? 'completed',
      outcome: json['outcome'] ?? 'other',
      duration: json['duration'] ?? 0,
      notes: json['notes'],
      followUpDate: json['followUpDate'] != null ? DateTime.parse(json['followUpDate']) : null,
      followUpNotes: json['followUpNotes'],
      priority: json['priority'],
      product: json['product'],
      location: json['location'],
      businessDetails: json['businessDetails'],
      orderStatus: json['orderStatus'],
      workerName: json['workerId'] is Map ? json['workerId']['name'] : null,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
    );
  }
}

class WorkerStats {
  final int totalCalls;
  final int todayCalls;
  final int totalLeads;
  final int conversions;
  final double conversionRate;

  WorkerStats({
    required this.totalCalls,
    required this.todayCalls,
    required this.totalLeads,
    required this.conversions,
    required this.conversionRate,
  });

  factory WorkerStats.fromJson(Map<String, dynamic> json) {
    return WorkerStats(
      totalCalls: json['totalCalls'] ?? 0,
      todayCalls: json['todayCalls'] ?? 0,
      totalLeads: json['totalLeads'] ?? 0,
      conversions: json['conversions'] ?? 0,
      conversionRate: double.tryParse(json['conversionRate']?.toString() ?? '0') ?? 0,
    );
  }
}
