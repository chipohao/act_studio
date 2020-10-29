#!/bin/bash
for file in ./sound/*;
do
    fname=`basename $file`
    fnamewo="${fname%%.*}"
    #echo $fnamewo
    ffmpeg -i $file -ss 0 -to 150 -c copy ./newsound/$fnamewo-1.mp3
    ffmpeg -i $file -ss 150 -to 300 -c copy ./newsound/$fnamewo-2.mp3
    ffmpeg -i $file -ss 300 -to 420 -c copy ./newsound/$fnamewo-3.mp3
done