import os
import sys
import time
import json
import asyncio
import re
from datetime import datetime, timedelta
from telethon import TelegramClient, events, sync, functions, types
from telethon.errors import (
    FloodWaitError,
    PhoneCodeInvalidError,
    SessionPasswordNeededError,
    PhoneNumberBannedError,
    PhoneNumberInvalidError,
    ChatWriteForbiddenError,
    MessageIdInvalidError
)
from telethon.tl.functions.channels import GetParticipantsRequest
from telethon.tl.types import ChannelParticipantsSearch
from rich.console import Console
from rich.panel import Panel
from rich.progress import (
    Progress,
    SpinnerColumn,
    BarColumn,
    TextColumn,
    TimeRemainingColumn,
    MofNCompleteColumn
)
from rich.live import Live
from rich import print as rprint
from rich.table import Table
from rich.prompt import Confirm, Prompt
from rich.status import Status
from rich.layout import Layout

console = Console()

# Configuration
API_ID = "25647083"
API_HASH = "dea41d5522659ab9917efec89ac21d21"
ADMIN_ID = "5988451717"

# App Details
APP_NAME = "Programmed Share hiyaok"
DEVICE_MODEL = "Programmed Share"
SYSTEM_VERSION = "Share System V1"

BANNER = """[bold magenta]
╔═══════════════════════════════════════════════════════════════════╗
║ ██╗  ██╗██╗██╗   ██╗ █████╗  ██████╗ ██╗  ██╗                   ║
║ ██║  ██║██║╚██╗ ██╔╝██╔══██╗██╔═══██╗██║ ██╔╝                   ║
║ ███████║██║ ╚████╔╝ ███████║██║   ██║█████╔╝                    ║
║ ██╔══██║██║  ╚██╔╝  ██╔══██║██║   ██║██╔═██╗                    ║
║ ██║  ██║██║   ██║   ██║  ██║╚██████╔╝██║  ██╗                   ║
║ ╚═╝  ╚═╝╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝                   ║
║                                                                   ║
║                TELEGRAM AUTO SHARE BY @HIYAOK                     ║
║                         Version 1.0                               ║
╚═══════════════════════════════════════════════════════════════════╝[/bold magenta]
"""

def loading_animation(text, duration=1):
    """Show loading animation"""
    with console.status(f"[cyan]{text}", spinner="dots") as status:
        time.sleep(duration)

class TelegramAutomation:
    def __init__(self):
        self.clients = {}
        self.console = Console()
        self.show_banner()
        self.active_tasks = {}

    def show_banner(self):
        """Show animated banner"""
        os.system('cls' if os.name == 'nt' else 'clear')
        loading_animation("Initializing Super Tool")
        self.console.print(BANNER)

    async def connect_account(self):
        """Mass connect accounts from file"""
        self.console.print("[bold cyan]📱 Mass Account Connection[/bold cyan]")
        
        file_path = Prompt.ask("[bold yellow]Enter path to accounts file (phone numbers)")
        try:
            with open(file_path, 'r') as f:
                phones = [line.strip() if line.strip().startswith('+') else '+' + line.strip() 
                         for line in f if line.strip()]
            
            loading_animation(f"Loading {len(phones)} accounts")

            async def connect_single(phone):
                try:
                    self.console.print(f"[cyan]Connecting {phone}...")
                    
                    client = TelegramClient(
                        f"session_{phone}",
                        API_ID,
                        API_HASH,
                        device_model=DEVICE_MODEL,
                        system_version=SYSTEM_VERSION,
                        app_version=APP_NAME
                    )
                    
                    await client.connect()
                    
                    if not await client.is_user_authorized():
                        await client.send_code_request(phone)
                        code = Prompt.ask(f"[bold yellow]Enter code for {phone}")
                        try:
                            await client.sign_in(phone, code)
                        except SessionPasswordNeededError:
                            password = Prompt.ask(f"[bold yellow]Enter 2FA password for {phone}", password=True)
                            await client.sign_in(password=password)
                    
                    self.clients[phone] = {
                        "client": client,
                        "groups": [],
                        "status": "active"
                    }
                    self.console.print(f"[green]✓ {phone} connected")
                    return True
                except Exception as e:
                    self.console.print(f"[red]✗ {phone} failed: {str(e)}")
                    return False

            # Connect all accounts simultaneously
            tasks = [connect_single(phone) for phone in phones]
            results = await asyncio.gather(*tasks)
            
            connected = sum(1 for r in results if r)
            self.console.print(f"[bold green]✓ Connected {connected}/{len(phones)} accounts")

        except Exception as e:
            self.console.print(f"[bold red]Error: {str(e)}[/bold red]")

    async def list_groups(self):
        """List all groups for all accounts"""
        if not self.clients:
            self.console.print("[bold red]No active accounts![/bold red]")
            return

        loading_animation("Loading groups")

        async def fetch_groups(phone, client_data):
            try:
                client = client_data["client"]
                groups = []
                
                async for dialog in client.iter_dialogs():
                    if dialog.is_group or dialog.is_channel:
                        groups.append({
                            "id": dialog.id,
                            "title": dialog.title
                        })
                
                client_data["groups"] = groups
                return phone, len(groups), groups[:3]  # Return preview of 3 groups
            except Exception as e:
                return phone, 0, []

        tasks = [fetch_groups(phone, data) for phone, data in self.clients.items()]
        results = await asyncio.gather(*tasks)

        # Display results in table
        table = Table(title="[bold cyan]Groups Summary[/bold cyan]")
        table.add_column("Phone", style="cyan")
        table.add_column("Total Groups", style="green")
        table.add_column("Preview", style="yellow")

        total_groups = 0
        for phone, count, preview in results:
            preview_text = ", ".join(g["title"] for g in preview) + "..." if preview else "None"
            table.add_row(phone, str(count), preview_text)
            total_groups += count

        self.console.print(table)
        self.console.print(f"[bold green]Total groups across all accounts: {total_groups}")

    async def forward_messages(self):
        """Mass forward messages from all accounts simultaneously"""
        if not self.clients:
            self.console.print("[bold red]No active accounts![/bold red]")
            return

        message_link = Prompt.ask("[bold yellow]Enter message link to forward")
        
        # Validate message using first available client
        test_client = list(self.clients.values())[0]["client"]
        
        try:
            match = re.match(r'https?://t\.me/([^/]+)/(\d+)', message_link)
            if not match:
                self.console.print("[bold red]Invalid message link format![/bold red]")
                return
                
            channel_username, message_id = match.groups()
            message_id = int(message_id)
            
            loading_animation("Validating message")
            
            message = await test_client.get_messages(channel_username, ids=message_id)
            if not message:
                self.console.print("[bold red]Message not found![/bold red]")
                return

            # Show preview
            self.console.print("\n[bold cyan]Message Preview:[/bold cyan]")
            preview = Panel(
                message.message[:500] + "..." if len(message.message) > 500 else message.message,
                title="Preview",
                style="green"
            )
            self.console.print(preview)

            # Get delay
            while True:
                try:
                    delay = float(Prompt.ask("[bold yellow]Enter delay between forwards (min 1 second)"))
                    if delay < 1:
                        self.console.print("[bold red]Delay must be at least 1 second![/bold red]")
                        continue
                    break
                except ValueError:
                    self.console.print("[bold red]Please enter a valid number![/bold red]")

            if not Confirm.ask("[bold yellow]Start mass forwarding?"):
                return

            async def process_account(phone, client_data):
                client = client_data["client"]
                groups = client_data["groups"]
                stats = {"success": 0, "failed": 0}
                
                for group in groups:
                    try:
                        await client.forward_messages(group["id"], message)
                        stats["success"] += 1
                        self.console.print(f"[green]✓ {phone} → {group['title']}")
                        await asyncio.sleep(delay)
                    except FloodWaitError as e:
                        await client.send_message(ADMIN_ID, f"""
⚠️ Flood Wait:
📱 Account: {phone}
⏳ Wait time: {e.seconds} seconds
""")
                        stats["failed"] += 1
                        await asyncio.sleep(e.seconds)
                        break
                    except Exception as e:
                        stats["failed"] += 1
                        self.console.print(f"[red]✗ {phone} → {group['title']}: {str(e)}")
                
                # Send summary
                await client.send_message(ADMIN_ID, f"""
📊 Forward Summary:
📱 Account: {phone}
✅ Success: {stats['success']}
❌ Failed: {stats['failed']}
⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
""")
                return stats

            # Continuous forwarding loop
            while True:
                with Live(auto_refresh=True) as live:
                    layout = Layout()
                    layout.split_column(
                        Layout(name="header", size=3),
                        Layout(name="body")
                    )
                    
                    live.console.print("[bold cyan]Mass Forward Progress[/bold cyan]")
                    
                    # Process all accounts simultaneously
                    tasks = [process_account(phone, data) for phone, data in self.clients.items()]
                    results = await asyncio.gather(*tasks)
                    
                    # Calculate totals
                    total_success = sum(r["success"] for r in results)
                    total_failed = sum(r["failed"] for r in results)
                    
                    live.console.print(f"""
[bold green]Round Complete:
✅ Total Success: {total_success}
❌ Total Failed: {total_failed}
⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}""")
                    
                    live.console.print("[yellow]Starting next round...[/yellow]")
                    await asyncio.sleep(delay)

        except Exception as e:
            self.console.print(f"[bold red]Error: {str(e)}[/bold red]")

async def main():
    tool = TelegramAutomation()
    
    while True:
        console.print("\n[bold cyan]📌 Main Menu:[/bold cyan]")
        menu = Panel.fit("""
[cyan]1.[/cyan] Mass Connect Accounts
[cyan]2.[/cyan] List All Groups
[cyan]3.[/cyan] Start Mass Forward
[cyan]4.[/cyan] Exit
""", title="Menu Options", border_style="cyan")
        
        console.print(menu)
        
        try:
            choice = Prompt.ask(
                "[bold yellow]Choose option",
                choices=["1", "2", "3", "4"],
                show_choices=False
            )
            
            loading_animation("Processing request")
            
            if choice == "1":
                await tool.connect_account()
            elif choice == "2":
                await tool.list_groups()
            elif choice == "3":
                await tool.forward_messages()
            elif choice == "4":
                loading_animation("Finalizing")
                console.print("[bold green]Thanks for using HIYAOK Telegram Automation![/bold green]")
                break

        except KeyboardInterrupt:
            console.print("\n[bold yellow]Interrupted by user. Exiting...[/bold yellow]")
            break
        except Exception as e:
            console.print(f"[bold red]Error: {str(e)}[/bold red]")
            console.print("[yellow]Press Enter to continue...[/yellow]")
            input()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        console.print("[bold yellow]\nExiting program...[/bold yellow]")
    except Exception as e:
        console.print(f"[bold red]Fatal Error: {str(e)}[/bold red]")
