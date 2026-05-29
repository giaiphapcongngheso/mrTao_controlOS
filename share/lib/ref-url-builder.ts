/**
 * Build full URL for viewing a reference document detail in another app.
 *
 * Uses the Resource's Application domain (ProductionDomain / StagingDomain / DevelopmentDomain)
 * combined with the Resource URL path and the document ID.
 *
 * Environment is determined by VITE_APP_ENV:
 *  - 'dev' → DevelopmentDomain
 *  - 'uat' → StagingDomain
 *  - 'production' → ProductionDomain
 */

export interface ResourceWithApplication {
  url?: string;
  application?: {
    productionDomain?: string;
    stagingDomain?: string;
    developmentDomain?: string;
  };
}

function getAppEnv(): string {
  try {
    return (import.meta as any).env?.VITE_APP_ENV ?? 'dev';
  } catch {
    return 'dev';
  }
}

/**
 * Build the full detail URL for a reference document.
 * @param resource - Resource object with url and application domain info
 * @param refDocId - The work item ID to view
 * @returns Full URL string or undefined if insufficient data
 */
export function buildRefDetailUrl(
  resource: ResourceWithApplication | undefined | null,
  refDocId: string | undefined | null,
): string | undefined {
  if (!resource?.url || !refDocId) return undefined;

  const env = getAppEnv();
  let domain: string | undefined;

  switch (env) {
    case 'production':
      domain = resource.application?.productionDomain;
      break;
    case 'uat':
      domain = resource.application?.stagingDomain;
      break;
    case 'dev':
    default:
      domain = resource.application?.developmentDomain;
      break;
  }

  if (!domain) return undefined;

  // Ensure domain doesn't end with slash and url starts with slash
  const cleanDomain = domain.replace(/\/+$/, '');
  const cleanUrl = (resource.url.startsWith('/') ? resource.url : `/${resource.url}`).replace(
    /\/+$/,
    '',
  );

  return `${cleanDomain}${cleanUrl}/${refDocId}/detail`;
}
