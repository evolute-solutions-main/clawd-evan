# Cold SMS Appointments — Collapsed (Tue, 2026-03-09, Global timezone)

Rule: person_key = (setter, phone). Keep only the latest post per person_key; EOD status is the channel of that latest post.
Filter: Unconfirmed → include; Confirmed → include only if Calendar contains "cold sms" (case-insensitive).

## Confirmed (Cold SMS only)
| Time     | Setter        | Name   | Phone        | Permalink |
|----------|---------------|--------|--------------|-----------|
| 07:55:15 | Eddie Murillo | JOE    | +16029084660 | <https://discord.com/channels/1164939432722440282/1332578941407334430/1480549529886396508> |
| 08:33:02 | Daniel Franco |        | +14804309978 | <https://discord.com/channels/1164939432722440282/1332578941407334430/1480559039053299762> |
| 10:13:04 | Daniel Franco | Carlos | +14803435038 | <https://discord.com/channels/1164939432722440282/1332578941407334430/1480584213173375240> |
| 11:46:07 | Daniel Franco | Jason  | +17039287319 | <https://discord.com/channels/1164939432722440282/1332578941407334430/1480607629079216249> |
| 12:34:36 | Randy Nadera  | Marcus | +19529564077 | <https://discord.com/channels/1164939432722440282/1332578941407334430/1480619833694490795> |
| 16:31:44 | Daniel Franco | Jim    | +14807096442 | <https://discord.com/channels/1164939432722440282/1332578941407334430/1480679509521993862> |

## Unconfirmed (always Cold SMS; chronological)
| Time     | Setter         | Name   | Phone        | Permalink |
|----------|----------------|--------|--------------|-----------|
| 10:50:53 | Richard Ramilo | Rick   | +19524513792 | <https://discord.com/channels/1164939432722440282/1387098677646196887/1480593731928199280> |
| 11:54:10 | Richard Ramilo |        | +15743120531 | <https://discord.com/channels/1164939432722440282/1387098677646196887/1480609655880421470> |
| 16:18:16 | Eddie Murillo  | oscar  | +13174800407 | <https://discord.com/channels/1164939432722440282/1387098677646196887/1480676118150516837> |
| 16:52:43 | Richard Ramilo |        | +15743027577 | <https://discord.com/channels/1164939432722440282/1387098677646196887/1480684789525905601> |
| 17:18:05 | Randy Nadera   | Scott  | +16236878221 | <https://discord.com/channels/1164939432722440282/1387098677646196887/1480691173818368286> |
| 17:24:21 | Randy Nadera   | Gordon | +14802870995 | <https://discord.com/channels/1164939432722440282/1387098677646196887/1480692751547760775> |

## Totals (Cold SMS only)
- Confirmed: 6
- Unconfirmed: 6
- Unique person_keys: 12
