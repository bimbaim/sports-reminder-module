'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { isValidEmailProvider } from '@/lib/email/email-service-factory';

interface UpdateEmailProviderResult {
  success: boolean;
  error?: string;
}

/**
 * Server action para atualizar a preferência de provedor de email do tenant
 * @param tenantId - ID do tenant a ser atualizado
 * @param provider - 'sendgrid' ou 'resend'
 * @returns Resultado com flag de sucesso e mensagem de erro opcional
 */
export async function updateTenantEmailProvider(
  tenantId: string,
  provider: string
): Promise<UpdateEmailProviderResult> {
  try {
    // 1. Validar inputs
    if (!tenantId || !provider) {
      return {
        success: false,
        error: 'Missing required fields',
      };
    }

    if (!isValidEmailProvider(provider)) {
      return {
        success: false,
        error: `Invalid email provider: ${provider}`,
      };
    }

    // 2. Verificar autorização (assegurar que o usuário é admin do tenant)
    // TODO: Adicionar verificação de autorização conforme o padrão do codebase existente
    // Exemplo:
    // const { user } = await getSession();
    // if (!user) return { success: false, error: 'Unauthorized' };
    // const hasPermission = await checkTenantPermission(user.id, tenantId, 'admin');
    // if (!hasPermission) return { success: false, error: 'Forbidden' };

    // 3. Atualizar banco de dados
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('tenants')
      .update({ email_provider: provider })
      .eq('id', tenantId);

    if (error) {
      console.error('[TenantAction] Database error:', error);
      return {
        success: false,
        error: 'Failed to update tenant settings',
      };
    }

    console.log(`[TenantAction] Updated tenant ${tenantId} email_provider to ${provider}`);
    return { success: true };
  } catch (error) {
    console.error('[TenantAction] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
