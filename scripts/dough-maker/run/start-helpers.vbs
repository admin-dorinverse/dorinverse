' Starts the dashboard and the Remote Control helper hidden, from the repo folder. A copy sits in the Windows
' Startup folder (shell:startup), so both come back by themselves when the PC signs in after a restart.
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Users\cassa\Dorinverse\dorinverse"
node = """C:\Program Files\nodejs\node.exe"""
sh.Run node & " scripts/dough-maker/run/dashboard.mjs", 0, False
sh.Run node & " scripts/dough-maker/run/remote-control.mjs", 0, False
