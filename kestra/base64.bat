@echo off

setlocal

set "string=%~1"

::echo %string%^|mshta.exe "%~f0"
for /f "delims=" %%# in ('echo %string%^|mshta.exe "%~f0"') do (
    set b64=%%#
)

set b64

endlocal&exit /b %errorlevel%

<HTA:Application
   ShowInTaskbar = no
   WindowsState=Minimize
   SysMenu=No
   ShowInTaskbar=No
   Caption=No
   Border=Thin
>
<meta http-equiv="x-ua-compatible" content="ie=10" />
<script language="javascript" type="text/javascript">
    window.visible=false;
    window.resizeTo(1,1);

   var fso= new ActiveXObject('Scripting.FileSystemObject').GetStandardStream(1);
   var fso2= new ActiveXObject('Scripting.FileSystemObject').GetStandardStream(0);
   var string=fso2.ReadLine();

    var encodedString = btoa(string);

   fso.Write(encodedString);
   window.close();
</script>