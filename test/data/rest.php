<?php
header("Content-Type: application/json");
if(isset($_SERVER["HTTP_RANGE"])){
	preg_match('/(\d+)-(\d+)/',$_SERVER["HTTP_RANGE"], $matches);
	
	$start = $matches[1];
	$end = $matches[2];
	if($end > 120){
		$end = 120;
	}
}else{
	$start = 0;
	$end = 40;
}
header("Content-Range: " . "items ".$start."-".$end."/120");
echo '[';
for ($i = $start; $i <= $end; $i++) {
	if($i != $start){
		echo ',';
	}
    echo '{"id":'.$i.',"name":"Item '.$i.'","comment":"hello"}';
}
echo ']';
?>
