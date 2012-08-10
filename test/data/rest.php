<?php
header("Content-Type: application/json");
$id_prefix = "";
if(isset($_GET["parent"])){
	$id_prefix = $_GET["parent"]."-";
}
if($_SERVER['REQUEST_METHOD'] == "POST"){
echo "{id:'1.5', name:'new', comment: 'new comment'}";
}else{
if(isset($_SERVER["HTTP_X_RANGE"])){
	preg_match('/(\d+)-(\d+)/',$_SERVER["HTTP_X_RANGE"], $matches);
	
	$start = $matches[1];
	$end = $matches[2];
	if($end > 112){
		$end = 112;
	}
}else{
	$start = 0;
	$end = 40;
}
header("Content-Range: " . "items ".$start."-".$end."/112");
echo '[';
for ($i = $start; $i <= $end; $i++) {
	if($i != $start){
		echo ',';
	}
    echo '{"id":"'.$id_prefix.$i.'","name":"Item '.$i.'","comment":"hello"}';
}
echo ']';
}
?>
