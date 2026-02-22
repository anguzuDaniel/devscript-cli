#!/bin/bash
# Open a new terminal window and run DevScript on the provided file
osascript -e "tell application \"Terminal\" to do script \"devscript run $(realpath $1)\""