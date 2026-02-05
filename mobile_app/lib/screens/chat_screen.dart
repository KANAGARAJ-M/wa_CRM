import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
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

class ChatScreen extends StatefulWidget {
  final Lead lead;

  const ChatScreen({super.key, required this.lead});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  List<Message> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;

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
    _loadMessages();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);
      final messages = await apiService.getMessages(widget.lead.phone);

      if (mounted) {
        setState(() {
          _messages = messages;
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading messages: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    _messageController.clear();
    setState(() => _isSending = true);

    final tempMessage = Message(
      id: 'temp-${DateTime.now().millisecondsSinceEpoch}',
      body: text,
      isIncoming: false,
      timestamp: DateTime.now(),
      status: 'pending',
    );
    setState(() => _messages.add(tempMessage));
    _scrollToBottom();

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final apiService = ApiService(authService.token!);
      await apiService.sendMessage(widget.lead.phone, text, phoneNumberId: widget.lead.phoneNumberId);
      await _loadMessages();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => _isSending = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
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
        title: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: _skeuoDebossedDecoration(
                baseColor: kAccentColor.withOpacity(0.15),
                radius: 20,
              ),
              child: Center(
                child: Text(
                  widget.lead.name[0].toUpperCase(),
                  style: TextStyle(color: kPrimaryColor, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.lead.name,
                    style: TextStyle(color: kTextColor, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    widget.lead.phone,
                    style: TextStyle(fontSize: 12, color: kSubTextColor),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.all(8),
            decoration: _skeuoEmbossedDecoration(radius: 10),
            child: IconButton(
              icon: const Icon(Icons.refresh_rounded, color: kSecondaryColor, size: 20),
              onPressed: _loadMessages,
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: kPrimaryColor))
                : _messages.isEmpty
                    ? Center(
                        child: Text(
                          'Start a conversation with ${widget.lead.name}',
                          style: TextStyle(color: kSubTextColor, fontStyle: FontStyle.italic),
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final message = _messages[index];
                          final showDate = index == 0 || !_isSameDay(_messages[index - 1].timestamp, message.timestamp);
                          return Column(
                            children: [
                              if (showDate) _buildDateDivider(message.timestamp),
                              _buildMessageBubble(message),
                            ],
                          );
                        },
                      ),
          ),

          // Tactile Input Area
          Container(
            padding: EdgeInsets.fromLTRB(16, 8, 16, MediaQuery.of(context).padding.bottom + 12),
            decoration: BoxDecoration(
              color: kCardColor,
              border: Border(top: BorderSide(color: kShadowColor.withOpacity(0.1))),
              boxShadow: [
                BoxShadow(
                  color: kShadowColor.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: _skeuoDebossedDecoration(radius: 24),
                    child: TextField(
                      controller: _messageController,
                      textCapitalization: TextCapitalization.sentences,
                      style: TextStyle(color: kTextColor, fontSize: 14, fontWeight: FontWeight.w500),
                      decoration: const InputDecoration(
                        hintText: 'Type a message',
                        hintStyle: TextStyle(color: kSubTextColor),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: _isSending ? null : _sendMessage,
                  child: Container(
                    width: 48, height: 48,
                    decoration: _isSending 
                      ? _skeuoButtonDecoration(kPrimaryColor, pressed: true) 
                      : _skeuoButtonDecoration(kPrimaryColor),
                    child: Center(
                      child: _isSending
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateDivider(DateTime date) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 20),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: _skeuoDebossedDecoration(radius: 20),
      child: Text(
        DateFormat('MMMM d, yyyy').format(date).toUpperCase(),
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kSubTextColor, letterSpacing: 1),
      ),
    );
  }

  Widget _buildMessageBubble(Message message) {
    final isMe = !message.isIncoming;
    
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: isMe 
          ? _skeuoEmbossedDecoration(
              baseColor: const Color(0xFFFDF5E6), // Old paper color
              radius: 18)
          : _skeuoEmbossedDecoration(
              baseColor: Colors.white, 
              radius: 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              message.body, 
              style: TextStyle(fontSize: 15, color: kTextColor, fontWeight: FontWeight.w500)
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  DateFormat('h:mm a').format(message.timestamp), 
                  style: TextStyle(fontSize: 10, color: kSubTextColor)
                ),
                if (isMe) ...[
                  const SizedBox(width: 6),
                  Icon(
                    message.status == 'read' ? Icons.done_all_rounded : message.status == 'delivered' ? Icons.done_all_rounded : Icons.done_rounded,
                    size: 14,
                    color: message.status == 'read' ? const Color(0xFF53BDEB) : kSubTextColor.withOpacity(0.5),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}
