import os
import sys
import time
import json
import asyncio
from datetime import datetime, timedelta
from telethon import TelegramClient, events, sync, functions
from telethon.errors import (
    FloodWaitError,
    PhoneCodeInvalidError,
    SessionPasswordNeededError,
    PhoneNumberBannedError,
    PhoneNumberInvalidError,
    ChatWriteForbiddenError
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
)
from rich import print as rprint
from rich.table import Table
from rich.prompt import Confirm, Prompt

# Initialize Rich console
console = Console()

# Configuration
API_ID = "25647083"
API_HASH = "dea41d5522659ab9917efec89ac21d21"
ADMIN_ID = "5988451717"  # ID Telegram untuk notifikasi

# Application Details
APP_NAME = "Programmed Share hiyaok"
DEVICE_MODEL = "Programmed Share"
SYSTEM_VERSION = "Share System V1"

BANNER = """
[bold magenta]
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
╚═══════════════════════════════════════════════════════════════════╝
[/bold magenta]
"""

class TelegramAutomation:
    def __init__(self):
        self.clients = {}  # {phone: {"client": client, "groups": []}}
        self.console = Console()
        self.show_banner()

    def show_banner(self):
        """Show program banner"""
        os.system('cls' if os.name == 'nt' else 'clear')
        self.console.print(BANNER)

    async def send_admin_notification(self, message, excluded_phone=None):
        """Send notification to admin"""
        for phone, client_data in self.clients.items():
            if phone == excluded_phone:
                continue
            try:
                await client_data["client"].send_message(ADMIN_ID, message)
                return True
            except:
                continue
        return False

    async def connect_single_account(self, phone):
        """Connect single Telegram account"""
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
                self.console.print(f"[yellow]Sending code to {phone}...")
                await client.send_code_request(phone)
                
                while True:
                    try:
                        code = Prompt.ask("[bold yellow]Enter the code received")
                        await client.sign_in(phone, code)
                        break
                    except PhoneCodeInvalidError:
                        self.console.print("[bold red]Invalid code! Try again.[/bold red]")

                # Check for 2FA
                try:
                    await client.get_me()
                except SessionPasswordNeededError:
                    while True:
                        try:
                            password = Prompt.ask("[bold yellow]Enter 2FA password", password=True)
                            await client.sign_in(password=password)
                            break
                        except Exception as e:
                            if "password is invalid" in str(e).lower():
                                self.console.print("[bold red]Invalid 2FA password! Try again.[/bold red]")
                            else:
                                raise e

            self.clients[phone] = {
                "client": client,
                "groups": []
            }
            self.console.print(f"[green]✓ Successfully connected {phone}")
            return True

        except Exception as e:
            self.console.print(f"[bold red]Error connecting {phone}: {str(e)}[/bold red]")
            return False

    async def connect_account(self):
        """Feature 1: Connect account"""
        self.console.print("[bold cyan]📱 Account Connection[/bold cyan]")
        
        phone = Prompt.ask("[bold yellow]Enter phone number (with country code)")
        if not phone.startswith('+'):
            phone = '+' + phone
            
        await self.connect_single_account(phone)

    async def delete_all_sessions(self):
        """Feature 2: Delete all sessions"""
        if not self.clients:
            self.console.print("[bold red]No active sessions![/bold red]")
            return

        table = Table(title="Active Sessions")
        table.add_column("Phone Number", style="cyan")
        table.add_column("Status", style="green")

        for phone in self.clients:
            table.add_row(phone, "Active")

        self.console.print(table)

        if Confirm.ask("[bold yellow]Delete all sessions?"):
            for phone, client_data in self.clients.items():
                try:
                    await client_data["client"].log_out()
                    session_file = f"session_{phone}.session"
                    if os.path.exists(session_file):
                        os.remove(session_file)
                    self.console.print(f"[green]✓ Deleted session for {phone}")
                except Exception as e:
                    self.console.print(f"[bold red]Error deleting {phone}: {str(e)}[/bold red]")

            self.clients = {}
            self.console.print("[bold green]✓ All sessions deleted![/bold green]")

    async def list_groups(self):
        """Feature 3: List all groups"""
        if not self.clients:
            self.console.print("[bold red]No active accounts![/bold red]")
            return

        for phone, client_data in self.clients.items():
            self.console.print(f"\n[bold cyan]Groups for {phone}:[/bold cyan]")
            
            try:
                client = client_data["client"]
                groups = []
                
                async for dialog in client.iter_dialogs():
                    if dialog.is_group or dialog.is_channel:
                        groups.append({
                            "id": dialog.id,
                            "title": dialog.title
                        })
                        self.console.print(f"[green]• {dialog.title}")

                client_data["groups"] = groups
                self.console.print(f"[bold green]Total groups: {len(groups)}")

            except Exception as e:
                self.console.print(f"[bold red]Error listing groups: {str(e)}[/bold red]")

    async def forward_messages(self):
        """Feature 4: Forward messages"""
        if not self.clients:
            self.console.print("[bold red]No active accounts![/bold red]")
            return

        message = Prompt.ask("[bold yellow]Enter message to forward")
        delay = float(Prompt.ask("[bold yellow]Enter delay between forwards (seconds)", default="30"))

        self.console.print("\n[bold cyan]Message Preview:[/bold cyan]")
        self.console.print(Panel(message, style="green"))

        if not Confirm.ask("[bold yellow]Start forwarding?"):
            return

        while True:  # Continuous loop
            for phone, client_data in self.clients.items():
                client = client_data["client"]
                groups = client_data["groups"]
                
                success_count = 0
                fail_count = 0

                self.console.print(f"\n[bold cyan]Forwarding with {phone}...[/bold cyan]")

                for group in groups:
                    try:
                        self.console.print(f"[cyan]→ Sending to {group['title']}...")
                        await client.send_message(group["id"], message)
                        success_count += 1
                        self.console.print(f"[green]✓ Sent to {group['title']}")
                        await asyncio.sleep(delay)

                    except FloodWaitError as e:
                        wait_time = e.seconds
                        fail_count += 1
                        self.console.print(f"[yellow]⚠️ Flood wait: {wait_time}s")
                        
                        await self.send_admin_notification(f"""
⚠️ Flood Wait:
📱 Account: {phone}
⏳ Wait time: {wait_time} seconds
👥 Group: {group['title']}
""", phone)
                        
                        await asyncio.sleep(wait_time)
                        break

                    except Exception as e:
                        fail_count += 1
                        self.console.print(f"[red]✗ Failed: {str(e)}")
                        
                        await self.send_admin_notification(f"""
❌ Forward Failed:
📱 Account: {phone}
👥 Group: {group['title']}
❗ Error: {str(e)}
""", phone)

                # Send summary
                summary = f"""
📊 Forward Summary for {phone}:
✅ Successful: {success_count}
❌ Failed: {fail_count}
📱 Total Groups: {len(groups)}
⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
                await self.send_admin_notification(summary, phone)

            # Wait before next round
            self.console.print("\n[bold yellow]Round completed. Starting next round...[/bold yellow]")
            await asyncio.sleep(delay)

async def main():
    tool = TelegramAutomation()
    
    while True:
        console.print("\n[bold cyan]📌 Main Menu:[/bold cyan]")
        console.print("1. Connect Account")
        console.print("2. Delete All Sessions")
        console.print("3. List Groups")
        console.print("4. Start Forward")
        console.print("5. Exit")
        
        try:
            choice = Prompt.ask("[bold yellow]Choose option", choices=["1", "2", "3", "4", "5"])
            
            if choice == "1":
                await tool.connect_account()
            elif choice == "2":
                await tool.delete_all_sessions()
            elif choice == "3":
                await tool.list_groups()
            elif choice == "4":
                await tool.forward_messages()
            elif choice == "5":
                console.print("[bold green]Thanks for using HIYAOK Telegram Automation![/bold green]")
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
