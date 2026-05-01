
import os

filepath = r'c:\Odi.Pet\update_supabase.sql'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# We want to remove the redundant section between the first 'on_vaccine_record_inserted' and the next valid section
# The first on_vaccine_record_inserted ends at line 366 (1-indexed)

start_delete = 366 # 0-indexed, line 367
end_delete = 547   # 0-indexed, line 548

new_lines = []
for i, line in enumerate(lines):
    if i == 365: # line 366
        new_lines.append("END;\n")
        new_lines.append("$$ LANGUAGE plpgsql SECURITY DEFINER;\n")
        new_lines.append("\n")
        new_lines.append("DROP TRIGGER IF EXISTS trigger_on_vaccine_record_inserted ON public.vaccine_records;\n")
        new_lines.append("CREATE TRIGGER trigger_on_vaccine_record_inserted\n")
        new_lines.append("  AFTER INSERT ON public.vaccine_records\n")
        new_lines.append("  FOR EACH ROW EXECUTE PROCEDURE public.on_vaccine_record_inserted();\n")
    elif i > 365 and i < 547:
        continue
    else:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
