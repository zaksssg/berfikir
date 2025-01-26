import os
import sys
import time
import json
import asyncio
from datetime import datetime, timedelta
from telethon import TelegramClient, events, sync
from telethon.errors import (
    FloodWaitError, 
    UserDeactivatedBanError, 
    UserSuspendedError,
    SessionPasswordNeededError
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
from rich.live import Live
from rich import print as rprint
from rich.table import Table
from rich.prompt import Confirm, Prompt
from rich.status import Status
import pyfiglet

# Initialize Rich console
console = Console()

# Configuration
API_ID = "25647083"
API_HASH = "dea41d5522659ab9917efec89ac21d21"
ADMIN_ID = "5988451717"

# Application Details
APP_NAME = "Programmed Share @hiyaok"
DEVICE_MODEL = "Programmed Share"
SYSTEM_VERSION = "Share System V2"

BANNER = """
[bold magenta]
╔══════════════════════════════════════════════════════════════════╗
║     _    _    ___   __ __    _      ___    _  __               ║
║    | |  | |  /   \ |  V  |  / \    / _ \  | |/ /              ║
║    | |__| | | | | || |V| | / _ \  | | | | | ' /               ║
║    |  __  | | | | || |V| |/ ___ \ | |_| | | . \               ║
║    |_|  |_|  \___/ |_| |_/_/   \_\ \___/  |_|\_\              ║
║                                                                 ║
║              TELEGRAM AUTOMATION SUPER TOOL V2                  ║
║         BY HIYAOK PROGRAMMER [ @hiyaok ] on telegram
╚══════════════════════════════════════════════════════════════════╝
[/bold magenta]
"""

class TelegramAutomation:
    def __init__(self):
        self.clients = {}  # {phone: {"client": client, "groups": []}}
        self.console = Console()
        self.show_banner()

    def show_banner(self):
        """Show the program banner"""
        os.system('cls' if os.name == 'nt' else 'clear')
        self.console.print(BANNER)

    async def connect_account(self):
        """Feature 1: Connect multiple Telegram accounts"""
        self.console.print("[bold cyan]📱 Mass Account Connection[/bold cyan]")
        self.console.print("\n1. Input manual")
        self.console.print("2. Import from file")
        
        choice = Prompt.ask("[bold yellow]Choose input method", choices=["1", "2"])
        
        phone_numbers = []
        if choice == "1":
            while True:
                phone = Prompt.ask("[bold yellow]Enter phone number (or 'done' to finish)")
                if phone.lower() == 'done':
                    break
                phone_numbers.append(phone)
        else:
            file_path = Prompt.ask("[bold yellow]Enter path to accounts file")
            try:
                with open(file_path, 'r') as f:
                    phone_numbers = [line.strip() for line in f if line.strip()]
                self.console.print(f"[green]✅ Loaded {len(phone_numbers)} accounts from file[/green]")
            except Exception as e:
                self.console.print(f"[red]Error loading file: {str(e)}[/red]")
                return

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TimeRemainingColumn(),
        ) as progress:
            tasks = {phone: progress.add_task(f"[cyan]Connecting {phone}...", total=100) 
                    for phone in phone_numbers}

            for phone in phone_numbers:
                if phone in self.clients:
                    progress.update(tasks[phone], description=f"[yellow]{phone} already connected")
                    continue

                try:
                    client = TelegramClient(
                        f"session_{phone}",
                        API_ID,
                        API_HASH,
                        device_model=DEVICE_MODEL,
                        system_version=SYSTEM_VERSION,
                        app_version=APP_NAME
                    )
                    progress.update(tasks[phone], advance=30)
                    
                    await client.connect()
                    progress.update(tasks[phone], advance=30)

                    if not await client.is_user_authorized():
                        await client.send_code_request(phone)
                        progress.update(tasks[phone], description=f"[yellow]Waiting for code: {phone}")
                        
                        code = Prompt.ask(f"[bold yellow]Enter code for {phone}")
                        try:
                            await client.sign_in(phone, code)
                        except SessionPasswordNeededError:
                            password = Prompt.ask(f"[bold yellow]2FA password for {phone}", password=True)
                            await client.sign_in(password=password)

                    self.clients[phone] = {
                        "client": client,
                        "groups": []
                    }
                    progress.update(tasks[phone], completed=100, description=f"[green]✅ {phone} connected")

                except Exception as e:
                    progress.update(tasks[phone], description=f"[red]❌ {phone} failed: {str(e)}")

    async def delete_all_sessions(self):
        """Feature 2: Delete all active sessions"""
        if not self.clients:
            self.console.print("[bold red]No active sessions found![/bold red]")
            return

        # Display active sessions
        table = Table(title="[bold cyan]Active Sessions[/bold cyan]")
        table.add_column("Phone Number", style="cyan")
        table.add_column("Status", style="green")

        for phone in self.clients:
            table.add_row(phone, "Active ✅")

        self.console.print(table)

        if Confirm.ask("[bold yellow]Delete all sessions?"):
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
            ) as progress:
                task = progress.add_task("[red]Deleting sessions...", total=len(self.clients))
                
                for phone, client_data in self.clients.items():
                    try:
                        await client_data["client"].log_out()
                        session_file = f"session_{phone}.session"
                        if os.path.exists(session_file):
                            os.remove(session_file)
                        progress.advance(task)
                        
                    except Exception as e:
                        self.console.print(f"[bold red]Error deleting session {phone}: {str(e)}[/bold red]")

            self.clients = {}
            self.console.print("[bold green]✅ All sessions deleted successfully![/bold green]")

    async def list_groups(self):
        """Feature 3: List groups for all accounts"""
        if not self.clients:
            self.console.print("[bold red]No active accounts![/bold red]")
            return

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TimeRemainingColumn(),
        ) as progress:
            tasks = {}
            for phone in self.clients:
                tasks[phone] = progress.add_task(f"[cyan]Listing groups for {phone}", total=100)

            for phone, client_data in self.clients.items():
                try:
                    client = client_data["client"]
                    groups = []
                    
                    async for dialog in client.iter_dialogs():
                        if dialog.is_group or dialog.is_channel:
                            groups.append({
                                "id": dialog.id,
                                "title": dialog.title
                            })
                            progress.advance(tasks[phone])

                    client_data["groups"] = groups
                    progress.update(tasks[phone], completed=100)

                except Exception as e:
                    progress.update(tasks[phone], description=f"[red]Error: {str(e)}")

        # Display summary
        table = Table(title="[bold cyan]Groups Summary[/bold cyan]")
        table.add_column("Phone", style="cyan")
        table.add_column("Total Groups", style="green")

        for phone, client_data in self.clients.items():
            table.add_row(phone, str(len(client_data["groups"])))

        self.console.print(table)

    async def forward_messages(self):
        """Feature 4: Mass forward messages to all groups"""
        if not self.clients:
            self.console.print("[bold red]No active accounts![/bold red]")
            return

        # Get message and delay
        message = Prompt.ask("[bold yellow]Enter message to forward")
        delay = float(Prompt.ask("[bold yellow]Enter delay between forwards (seconds)", default="30"))

        # Show preview
        self.console.print("\n[bold cyan]Message Preview:[/bold cyan]")
        self.console.print(Panel(message, style="green"))

        if not Confirm.ask("[bold yellow]Start mass forwarding?"):
            return

        while True:  # Continuous loop
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TextColumn("• {task.completed}/{task.total}"),
                TimeRemainingColumn(),
            ) as progress:
                tasks = {}
                
                # Create tasks for each account
                for phone, client_data in self.clients.items():
                    total_groups = len(client_data["groups"])
                    tasks[phone] = progress.add_task(
                        f"[cyan]{phone}",
                        total=total_groups if total_groups > 0 else 100
                    )

                # Process each account
                for phone, client_data in self.clients.items():
                    client = client_data["client"]
                    groups = client_data["groups"]

                    for group in groups:
                        try:
                            progress.update(
                                tasks[phone],
                                description=f"[cyan]{phone} → {group['title'][:30]}..."
                            )

                            await client.send_message(group["id"], message)
                            progress.advance(tasks[phone])
                            
                            # Send success notification to admin
                            try:
                                await client.send_message(ADMIN_ID, f"""
✅ Message forwarded successfully:
📱 Account: {phone}
👥 Group: {group['title']}
⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
""")
                            except:
                                pass

                            await asyncio.sleep(delay)

                        except FloodWaitError as e:
                            wait_time = e.seconds
                            progress.update(
                                tasks[phone],
                                description=f"[yellow]⚠️ {phone} flood wait: {wait_time}s"
                            )
                            
                            # Notify admin about flood
                            try:
                                await client.send_message(ADMIN_ID, f"""
⚠️ Flood wait detected:
📱 Account: {phone}
⏳ Wait time: {wait_time} seconds
👥 At group: {group['title']}
""")
                            except:
                                pass
                            
                            await asyncio.sleep(wait_time)
                            break

                        except Exception as e:
                            progress.update(
                                tasks[phone],
                                description=f"[red]❌ {phone} error: {str(e)[:50]}..."
                            )
                            
                            # Notify admin about error
                            try:
                                await client.send_message(ADMIN_ID, f"""
❌ Forward failed:
📱 Account: {phone}
👥 Group: {group['title']}
❗ Error: {str(e)}
""")
                            except:
                                pass

                # Wait before next round
                self.console.print("[bold yellow]Completed one round. Starting next round...[/bold yellow]")
                await asyncio.sleep(delay)

async def main():
    tool = TelegramAutomation()
    
    while True:
        console.print("\n[bold cyan]📌 Main Menu:[/bold cyan]")
        console.print("1. Connect Accounts (Mass)")
        console.print("2. Delete All Sessions")
        console.print("3. List All Groups")
        console.print("4. Start Mass Forward")
        console.print("5. Exit")
        
        choice = Prompt.ask("[bold yellow]Choose an option", choices=["1", "2", "3", "4", "5"])
        
        try:
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

if __name__ == "__main__":
    asyncio.run(main())
