import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// SSH 密钥检测优先级（从高到低）
const SSH_KEY_PRIORITY = [
  'id_ed25519',  // Ed25519 - 更现代、更安全
  'id_rsa',      // RSA - 传统兼容
  'id_ecdsa',    // ECDSA
  'id_dsa',      // DSA - 已不推荐，但仍支持检测
];

// GET /api/ssh-keys - 检测本地存在的 SSH 密钥
export async function GET() {
  try {
    const sshDir = join(homedir(), '.ssh');
    const detectedKeys: string[] = [];
    let defaultKey = '~/.ssh/id_rsa'; // fallback 默认值

    // 按优先级检测密钥文件
    for (const keyName of SSH_KEY_PRIORITY) {
      const keyPath = join(sshDir, keyName);
      if (existsSync(keyPath)) {
        detectedKeys.push(`~/.ssh/${keyName}`);
      }
    }

    // 使用检测到的第一个密钥作为默认值
    if (detectedKeys.length > 0) {
      defaultKey = detectedKeys[0];
    }

    return NextResponse.json({
      defaultKey,
      detectedKeys,
      sshDir: '~/.ssh',
    });
  } catch (error) {
    console.error('Failed to detect SSH keys:', error);
    return NextResponse.json(
      {
        defaultKey: '~/.ssh/id_rsa',
        detectedKeys: [],
        error: 'Failed to detect SSH keys'
      },
      { status: 500 }
    );
  }
}
