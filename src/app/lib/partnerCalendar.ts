import { supabase } from './supabase';
import { CalendarEvent } from '../types/planner';

export interface PartnerConnection {
  id: string;
  userId: string;
  partnerId: string | null;
  connectionCode: string;
  status: 'pending' | 'active';
}

// 6자리 연결 코드 생성
function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 내 연결 정보 조회
export async function getMyConnection(userId: string): Promise<PartnerConnection | null> {
  const { data, error } = await supabase
    .from('partner_connections')
    .select('*')
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) return null;

  // Prefer active connection, otherwise take the most recent
  const row = data.find(d => d.status === 'active') || data[0];

  return {
    id: row.id,
    userId: row.user_id,
    partnerId: row.partner_id,
    connectionCode: row.connection_code,
    status: row.status,
  };
}

// 연결 코드 생성 (내가 먼저 시작)
export async function createConnectionCode(userId: string): Promise<string | null> {
  // Delete ALL existing connections for this user (as user_id or partner_id)
  await supabase
    .from('partner_connections')
    .delete()
    .eq('user_id', userId);
  await supabase
    .from('partner_connections')
    .delete()
    .eq('partner_id', userId);

  const code = generateCode();
  const { error } = await supabase
    .from('partner_connections')
    .insert({ user_id: userId, connection_code: code, status: 'pending' });

  if (error) return null;
  return code;
}

// 코드로 연결 수락
export async function acceptConnectionCode(
  partnerId: string,
  code: string
): Promise<'ok' | 'not-found' | 'self' | 'error'> {
  const { data, error } = await supabase
    .from('partner_connections')
    .select('*')
    .eq('connection_code', code.toUpperCase())
    .eq('status', 'pending')
    .maybeSingle();

  if (error || !data) return 'not-found';
  if (data.user_id === partnerId) return 'self';

  const { error: updateError } = await supabase
    .from('partner_connections')
    .update({ partner_id: partnerId, status: 'active' })
    .eq('id', data.id);

  if (updateError) return 'error';
  return 'ok';
}

// 연결 해제
export async function disconnectPartner(connectionId: string): Promise<void> {
  await supabase.from('partner_connections').delete().eq('id', connectionId);
}

// 파트너 이벤트 불러오기
export async function fetchPartnerEvents(
  userId: string,
  partnerId: string,
  yearMonth: string // 'yyyy-MM'
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', partnerId)
    .gte('date', `${yearMonth}-01`)
    .lte('date', `${yearMonth}-31`);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.start_time || '00:00',
    endTime: row.end_time || '00:00',
    categoryId: row.category_id || '',
    memo: row.memo,
    repeat: row.repeat,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
