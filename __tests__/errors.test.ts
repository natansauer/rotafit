// Substitui o "money.test.ts" citado no guia (herdado de outro projeto da série,
// sem código correspondente no RotaFit). Mantém a contagem de 37 testes do app.
import { friendlyError } from '@/utils/errors';

describe('friendlyError', () => {
  it('usa a mensagem de um Error comum', () => {
    expect(friendlyError(new Error('Falhou'))).toBe('Falhou');
  });

  it('aceita objetos com "message" (PostgrestError do Supabase)', () => {
    expect(friendlyError({ message: 'duplicate key', code: '23505' })).toBe(
      'duplicate key',
    );
  });

  it('aceita uma string', () => {
    expect(friendlyError('texto simples')).toBe('texto simples');
  });

  it('traduz falha de rede', () => {
    expect(friendlyError(new TypeError('Network request failed'))).toMatch(/internet/);
  });

  it('traduz violação de RLS', () => {
    expect(friendlyError({ message: 'new row violates row-level security policy' })).toMatch(
      /sessão/,
    );
  });

  it('traduz exigência de Premium do Spotify', () => {
    expect(friendlyError(new Error('Player command failed: Premium required'))).toMatch(
      /Premium/,
    );
  });

  it('tem uma mensagem padrão para erros desconhecidos', () => {
    expect(friendlyError(undefined)).toBe('Algo deu errado. Tente novamente.');
    expect(friendlyError(42)).toBe('Algo deu errado. Tente novamente.');
  });
});
