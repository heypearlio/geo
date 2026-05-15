-- Migration: merge lead_nurture + claim_nurture → warm_nurture
-- Update get_leads_missing_step1 to look for warm_nurture instead of lead_nurture

CREATE OR REPLACE FUNCTION get_leads_missing_step1()
RETURNS TABLE(email text, first_name text) LANGUAGE sql STABLE AS
$func$
  SELECT DISTINCT q.email, q.first_name
  FROM geo_email_queue q
  WHERE q.sequence = 'warm_nurture'
    AND q.step >= 2
    AND q.cancelled_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM geo_email_queue q2
      WHERE q2.email = q.email
        AND q2.sequence = 'warm_nurture'
        AND q2.step = 1
        AND q2.cancelled_at IS NULL
    )
$func$;
