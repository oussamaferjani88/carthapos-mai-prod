; CarthaPos Custom NSIS Installer Script
; This script ensures the data folder is created at installation time

!macro customInstall
  ; Create the 'data' folder in the installation directory
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\backups"
  CreateDirectory "$INSTDIR\data\logs"
  
  DetailPrint "✅ Creating application data folders..."
  DetailPrint "  📁 Data folder: $INSTDIR\data\"
  DetailPrint "  📁 Backups folder: $INSTDIR\data\backups\"
  DetailPrint "  📁 Logs folder: $INSTDIR\data\logs\"
!macroend

!macro customUnInstall
  ; Remove data folders on uninstall (optional - user may want to keep data)
  ; Uncomment the lines below if you want to delete data on uninstall
  ; RMDir /r "$INSTDIR\data\backups"
  ; RMDir /r "$INSTDIR\data\logs"
  ; Note: We do NOT delete the main $INSTDIR\data folder to preserve user data
  DetailPrint "ℹ️ User data preserved in: $INSTDIR\data\"
!macroend
