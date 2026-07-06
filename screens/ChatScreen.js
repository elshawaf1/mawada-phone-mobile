import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChevronLeft, Send, Phone } from 'lucide-react-native';
import { useDirection } from '../hooks/useDirection';

const { width } = Dimensions.get('window');

const BOT_REPLIES = [
  'مرحباً! كيف يمكنني مساعدتك اليوم؟ 😊',
  'سأتحقق من ذلك فوراً لك، لحظة من فضلك.',
  'بالطبع! يسعدني مساعدتك في هذا الأمر.',
  'يمكنك التواصل معنا أيضاً على الرقم: 01234567890',
  'هل هناك أي شيء آخر يمكنني مساعدتك فيه؟',
  'سيتم معالجة طلبك في أقرب وقت ممكن. شكراً لتواصلك معنا!',
];

const QUICK_REPLIES = [
  'استفسار عن طلب',
  'الإرجاع والاستبدال',
  'الدفع والفواتير',
  'التوصيل والشحن',
  'عروض وخصومات',
];

const INITIAL_MESSAGES = [
  {
    id: 'w1',
    from: 'bot',
    text: 'أهلاً وسهلاً! 👋 مرحباً بك في خدمة عملاء مودة فون.',
    time: now(),
    read: true,
  },
  {
    id: 'w2',
    from: 'bot',
    text: 'كيف يمكنني مساعدتك اليوم؟ يمكنك اختيار أحد الأسئلة الشائعة أو كتابة استفسارك مباشرةً.',
    time: now(),
    read: true,
  },
];

function now() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

let msgId = 100;
function nextId() {
  return String(msgId++);
}

export default function ChatScreen({ navigation }) {
  const dir = useDirection();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  const sendMessage = (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;
    setInput('');

    const userMsg = { id: nextId(), from: 'user', text: trimmed, time: now(), read: false };
    setMessages((prev) => [...prev, userMsg]);

    setIsTyping(true);
    const delay = 800 + Math.random() * 700;
    setTimeout(() => {
      setIsTyping(false);
      const botReply = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
      const botMsg = { id: nextId(), from: 'bot', text: botReply, time: now(), read: true };
      setMessages((prev) => [...prev, botMsg]);
    }, delay);
  };

  const deleteMessage = (id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ── HEADER ── */}
      <View style={[styles.header, { flexDirection: dir.row }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#fff" size={20} />
        </TouchableOpacity>

        <View style={[styles.headerInfo, { flexDirection: dir.row }]}>
          <View style={styles.agentAvatarRing}>
            <View style={styles.agentAvatar}>
              <Ionicons name="headset-outline" size={18} color="#fff" />
            </View>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.agentName}>خدمة عملاء مودة فون</Text>
            <Text style={styles.agentStatus}>متاح الآن • يرد عادةً خلال دقائق</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerBtn}>
          <Phone size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ── MESSAGES ── */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Date label */}
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>اليوم</Text>
          </View>

          {messages.map((msg) => (
            <TouchableOpacity
              key={msg.id}
              activeOpacity={0.8}
              onLongPress={() => deleteMessage(msg.id)}
              style={[
                styles.msgRow,
                msg.from === 'user' ? styles.msgRowUser : styles.msgRowBot,
                msg.from === 'user' && { flexDirection: dir.row },
              ]}
            >
              {msg.from === 'bot' && (
                <View style={styles.botAvatarSmall}>
                  <Ionicons name="headset-outline" size={13} color="#fff" />
                </View>
              )}

              <View
                style={[
                  styles.bubble,
                  msg.from === 'user' ? styles.bubbleUser : styles.bubbleBot,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.from === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot,
                    { textAlign: dir.textAlign },
                  ]}
                >
                  {msg.text}
                </Text>
                <View style={[styles.bubbleMeta, { flexDirection: dir.row }]}>
                  {msg.from === 'user' && (
                    <Ionicons
                      name="checkmark-done"
                      size={13}
                      color={msg.read ? '#38BDF8' : 'rgba(255,255,255,0.6)'}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.bubbleTime,
                      msg.from === 'user' ? styles.bubbleTimeUser : styles.bubbleTimeBot,
                    ]}
                  >
                    {msg.time}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {isTyping && (
            <View style={[styles.msgRow, styles.msgRowBot]}>
              <View style={styles.botAvatarSmall}>
                <Ionicons name="headset-outline" size={13} color="#fff" />
              </View>
              <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                <View style={[styles.typingDots, { flexDirection: dir.row }]}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── QUICK REPLIES ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickRepliesBar}
          contentContainerStyle={[styles.quickRepliesContent, { flexDirection: dir.row }]}
        >
          {QUICK_REPLIES.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.quickChip}
              onPress={() => sendMessage(q)}
            >
              <Text style={styles.quickChipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── INPUT BAR ── */}
        <View style={[styles.inputBar, { flexDirection: dir.row }]}>
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim()}
          >
            <Send size={18} color="#fff" style={dir.translateStart} />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="اكتب رسالتك..."
            placeholderTextColor="#94A3B8"
            value={input}
            onChangeText={setInput}
            textAlign="right"
            multiline
            maxLength={400}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
          />

          <TouchableOpacity style={styles.attachBtn}>
            <Ionicons name="attach" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },

  // Header
  header: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  agentAvatarRing: { position: 'relative' },
  agentAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#0F172A',
  },
  headerText: { alignItems: 'flex-start' },
  agentName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  agentStatus: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  // Messages
  messagesArea: { flex: 1 },
  messagesContent: { padding: 14, paddingBottom: 4 },
  dateBadge: {
    alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14,
  },
  dateBadgeText: { fontSize: 11, color: '#64748B', fontWeight: '600' },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  msgRowUser: { flexDirection: 'row' },
  msgRowBot: { flexDirection: 'row' },

  botAvatarSmall: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center',
    marginLeft: 6, flexShrink: 0,
  },

  bubble: {
    maxWidth: width * 0.72, borderRadius: 18,
    paddingHorizontal: 13, paddingVertical: 9,
  },
  bubbleUser: {
    backgroundColor: '#0F172A',
    borderBottomLeftRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#FFFFFF',
    borderBottomRightRadius: 4,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1,
  },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: '#fff', textAlign: 'left' },
  bubbleTextBot: { color: '#0F172A', textAlign: 'left' },
  bubbleMeta: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 4 },
  bubbleTime: { fontSize: 10 },
  bubbleTimeUser: { color: 'rgba(255,255,255,0.55)' },
  bubbleTimeBot: { color: '#94A3B8' },

  typingBubble: { paddingVertical: 14 },
  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#94A3B8' },
  dot1: { opacity: 1 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.3 },

  // Quick replies
  quickRepliesBar: { maxHeight: 48, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  quickRepliesContent: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  quickChip: {
    backgroundColor: '#fff', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  quickChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    gap: 8,
  },
  attachBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  input: {
    flex: 1, minHeight: 36, maxHeight: 100,
    backgroundColor: '#F8FAFC', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    fontSize: 14, color: '#0F172A',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#CBD5E1' },
});
