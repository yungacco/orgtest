-- ===========================================================================
--  BENESSERE — Verifica della sicurezza del database
-- ===========================================================================
--  COME SI USA
--  1. Supabase -> SQL Editor -> New query
--  2. Incolla tutto questo file e premi "Run"
--  3. Leggi la colonna "esito": deve essere tutto ✅
--
--  Non modifica niente: si limita a controllare. Puoi eseguirlo quando vuoi,
--  soprattutto dopo aver toccato qualcosa su Supabase.
-- ===========================================================================

with
tabelle as (
  select c.relname::text as tabella, c.relrowsecurity as rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
),
policy_per_tabella as (
  select tablename::text as tabella,
         count(*) filter (where cmd = 'SELECT') as lettura,
         count(*) filter (where cmd = 'INSERT') as inserimento,
         count(*) filter (where cmd = 'UPDATE') as modifica,
         count(*) filter (where cmd = 'DELETE') as cancellazione,
         count(*) filter (
           where 'anon' = any(roles) or 'public' = any(roles) or roles is null
         ) as aperte_a_tutti,
         count(*) filter (
           where coalesce(qual, '') not like '%auth.uid()%'
             and coalesce(with_check, '') not like '%auth.uid()%'
         ) as senza_filtro_utente
  from pg_policies
  where schemaname = 'public'
  group by tablename
),
controlli as (

  select 1 as n,
         'Row Level Security attiva su tutte le tabelle' as controllo,
         case when count(*) = 0 then '✅ ok' else '❌ DA SISTEMARE' end as esito,
         coalesce(string_agg(tabella, ', '), 'nessuna tabella scoperta') as dettaglio
  from tabelle where not rls

  union all
  select 2,
         'Ogni tabella ha le 4 regole (lettura/inserimento/modifica/cancellazione)',
         case when count(*) = 0 then '✅ ok' else '❌ DA SISTEMARE' end,
         coalesce(string_agg(t.tabella, ', '), 'tutte complete')
  from tabelle t
  left join policy_per_tabella p on p.tabella = t.tabella
  where coalesce(p.lettura, 0) = 0 or coalesce(p.inserimento, 0) = 0
     or coalesce(p.modifica, 0) = 0 or coalesce(p.cancellazione, 0) = 0

  union all
  select 3,
         'Nessuna regola aperta ai visitatori non autenticati',
         case when coalesce(sum(aperte_a_tutti), 0) = 0 then '✅ ok' else '❌ DA SISTEMARE' end,
         coalesce(string_agg(tabella, ', ') filter (where aperte_a_tutti > 0), 'nessuna')
  from policy_per_tabella

  union all
  select 4,
         'Ogni regola filtra per utente collegato (auth.uid())',
         case when coalesce(sum(senza_filtro_utente), 0) = 0 then '✅ ok' else '❌ DA SISTEMARE' end,
         coalesce(string_agg(tabella, ', ') filter (where senza_filtro_utente > 0), 'nessuna')
  from policy_per_tabella

  union all
  select 5,
         'Il bucket delle foto "ricette" e'' privato',
         case when exists (select 1 from storage.buckets where id = 'ricette' and public = false)
              then '✅ ok'
              when exists (select 1 from storage.buckets where id = 'ricette')
              then '❌ DA SISTEMARE'
              else '⚠️ bucket assente' end,
         coalesce((select case when public then 'PUBBLICO' else 'privato' end
                   from storage.buckets where id = 'ricette'), 'non trovato')

  union all
  select 6,
         'Le foto hanno le 4 regole di accesso',
         case when count(*) >= 4 then '✅ ok' else '❌ DA SISTEMARE' end,
         count(*) || ' regole trovate sul bucket'
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects' and policyname like 'ricette%'

  union all
  select 7,
         'Le funzioni con privilegi elevati hanno il percorso di ricerca bloccato',
         case when count(*) = 0 then '✅ ok' else '⚠️ da irrobustire' end,
         coalesce(string_agg(proname, ', '), 'nessuna funzione a rischio')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and (p.proconfig is null or not exists (
      select 1 from unnest(p.proconfig) c where c like 'search_path=%'
    ))
)
select controllo, esito, dettaglio from controlli order by n;

-- ---------------------------------------------------------------------------
-- Dettaglio tabella per tabella (utile per un'occhiata d'insieme)
-- ---------------------------------------------------------------------------
select c.relname as tabella,
       case when c.relrowsecurity then '✅' else '❌' end as protetta,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as regole
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
